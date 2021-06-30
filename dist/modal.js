
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.modal = factory());
}(this, (function () { 'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(claimed_nodes) {
            this.e = this.n = null;
            this.l = claimed_nodes;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                if (this.l) {
                    this.n = this.l;
                }
                else {
                    this.h(html);
                }
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src\Modal.svelte generated by Svelte v3.38.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    // (85:0) {#if visible}
    function create_if_block(ctx) {
    	let div2;
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let current_block_type_index;
    	let if_block2;
    	let t2;
    	let div1_intro;
    	let div1_outro;
    	let div2_intro;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[5]) return create_if_block_4;
    		if (/*closable*/ ctx[11]) return create_if_block_6;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type && current_block_type(ctx);
    	let if_block1 = /*heading*/ ctx[13] && create_if_block_3(ctx);
    	const if_block_creators = [create_if_block_2, create_else_block];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*content*/ ctx[22]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block3 = /*buttons*/ ctx[4].length && create_if_block_1(ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			attr(div0, "class", "modal-scroller svelte-1vmia");
    			toggle_class(div0, "faded", /*fadeonload*/ ctx[10] && /*loading*/ ctx[5]);
    			attr(div1, "class", "modal-inner modal-bordered svelte-1vmia");
    			set_style(div1, "background", /*innerbg*/ ctx[15]);
    			set_style(div1, "border-radius", /*borderradius*/ ctx[19]);
    			set_style(div1, "top", /*topoffset*/ ctx[20]);
    			toggle_class(div1, "wide", /*wide*/ ctx[16]);
    			toggle_class(div1, "full", /*fullwidth*/ ctx[17]);
    			attr(div2, "class", "modal modal-backdrop svelte-1vmia");
    			set_style(div2, "background-color", /*bgcolor*/ ctx[14]);
    			set_style(div2, "z-index", /*zindex*/ ctx[18]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			if (if_block1) if_block1.m(div0, null);
    			append(div0, t1);
    			if_blocks[current_block_type_index].m(div0, null);
    			append(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div1, "click", stop_propagation(/*click_handler*/ ctx[32])),
    					listen(div1, "click", stop_propagation(/*click_handler_1*/ ctx[33])),
    					listen(div2, "click", /*bgclick*/ ctx[26])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			}

    			if (/*heading*/ ctx[13]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks[current_block_type_index];

    				if (!if_block2) {
    					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block2.c();
    				} else {
    					if_block2.p(ctx, dirty);
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(div0, t2);
    			}

    			if (/*buttons*/ ctx[4].length) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1(ctx);
    					if_block3.c();
    					if_block3.m(div0, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty[0] & /*fadeonload, loading*/ 1056) {
    				toggle_class(div0, "faded", /*fadeonload*/ ctx[10] && /*loading*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*innerbg*/ 32768) {
    				set_style(div1, "background", /*innerbg*/ ctx[15]);
    			}

    			if (!current || dirty[0] & /*borderradius*/ 524288) {
    				set_style(div1, "border-radius", /*borderradius*/ ctx[19]);
    			}

    			if (!current || dirty[0] & /*topoffset*/ 1048576) {
    				set_style(div1, "top", /*topoffset*/ ctx[20]);
    			}

    			if (dirty[0] & /*wide*/ 65536) {
    				toggle_class(div1, "wide", /*wide*/ ctx[16]);
    			}

    			if (dirty[0] & /*fullwidth*/ 131072) {
    				toggle_class(div1, "full", /*fullwidth*/ ctx[17]);
    			}

    			if (!current || dirty[0] & /*bgcolor*/ 16384) {
    				set_style(div2, "background-color", /*bgcolor*/ ctx[14]);
    			}

    			if (!current || dirty[0] & /*zindex*/ 262144) {
    				set_style(div2, "z-index", /*zindex*/ ctx[18]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block2);

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, /*transinnerFunc*/ ctx[24], /*transinnerInOptions*/ ctx[2]);
    				div1_intro.start();
    			});

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, /*transbgFunc*/ ctx[23], /*transbgInOptions*/ ctx[0]);
    				div2_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(if_block2);
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, /*transinnerFunc*/ ctx[24], /*transinnerOutOptions*/ ctx[3]);
    			if (div2_intro) div2_intro.invalidate();
    			div2_outro = create_out_transition(div2, /*transbgFunc*/ ctx[23], /*transbgOutOptions*/ ctx[1]);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);

    			if (if_block0) {
    				if_block0.d();
    			}

    			if (if_block1) if_block1.d();
    			if_blocks[current_block_type_index].d();
    			if (if_block3) if_block3.d();
    			if (detaching && div1_outro) div1_outro.end();
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (95:31) 
    function create_if_block_6(ctx) {
    	let div;
    	let t;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t = text("×");
    			attr(div, "class", div_class_value = "modal-closer " + /*closepos*/ ctx[12] + " svelte-1vmia");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);

    			if (!mounted) {
    				dispose = listen(div, "click", stop_propagation(/*click_handler_2*/ ctx[34]));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*closepos*/ 4096 && div_class_value !== (div_class_value = "modal-closer " + /*closepos*/ ctx[12] + " svelte-1vmia")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (89:12) {#if loading}
    function create_if_block_4(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*loadingtext*/ ctx[9]) return create_if_block_5;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (92:16) {:else}
    function create_else_block_1(ctx) {
    	let img;
    	let img_src_value;
    	let img_class_value;

    	return {
    		c() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*loadiconpath*/ ctx[8])) attr(img, "src", img_src_value);
    			attr(img, "alt", "loading");
    			attr(img, "class", img_class_value = "modal-load-icon " + /*loadpos*/ ctx[6] + " svelte-1vmia");
    			set_style(img, "width", /*loadiconwidth*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*loadiconpath*/ 256 && img.src !== (img_src_value = /*loadiconpath*/ ctx[8])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*loadpos*/ 64 && img_class_value !== (img_class_value = "modal-load-icon " + /*loadpos*/ ctx[6] + " svelte-1vmia")) {
    				attr(img, "class", img_class_value);
    			}

    			if (dirty[0] & /*loadiconwidth*/ 128) {
    				set_style(img, "width", /*loadiconwidth*/ ctx[7]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    		}
    	};
    }

    // (90:16) {#if loadingtext}
    function create_if_block_5(ctx) {
    	let div;
    	let t;
    	let div_class_value;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*loadingtext*/ ctx[9]);
    			attr(div, "class", div_class_value = "modal-load-icon " + /*loadpos*/ ctx[6] + " svelte-1vmia");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*loadingtext*/ 512) set_data(t, /*loadingtext*/ ctx[9]);

    			if (dirty[0] & /*loadpos*/ 64 && div_class_value !== (div_class_value = "modal-load-icon " + /*loadpos*/ ctx[6] + " svelte-1vmia")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (102:16) {#if heading}
    function create_if_block_3(ctx) {
    	let h2;
    	let t;

    	return {
    		c() {
    			h2 = element("h2");
    			t = text(/*heading*/ ctx[13]);
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*heading*/ 8192) set_data(t, /*heading*/ ctx[13]);
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    // (109:16) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[31].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[30], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 1073741824)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[30], !current ? [-1, -1] : dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (106:16) {#if content}
    function create_if_block_2(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(/*content*/ ctx[22], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*content*/ 4194304) html_tag.p(/*content*/ ctx[22]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (113:16) {#if buttons.length}
    function create_if_block_1(ctx) {
    	let div;
    	let each_value = /*buttons*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "buttons svelte-1vmia");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*buttons, dispatch*/ 33554448) {
    				each_value = /*buttons*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (115:24) {#each buttons as button}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*button*/ ctx[36].text + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[35](/*button*/ ctx[36]);
    	}

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			attr(button, "class", button_class_value = "" + (null_to_empty(/*button*/ ctx[36].class) + " svelte-1vmia"));
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler_3);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*buttons*/ 16 && t_value !== (t_value = /*button*/ ctx[36].text + "")) set_data(t, t_value);

    			if (dirty[0] & /*buttons*/ 16 && button_class_value !== (button_class_value = "" + (null_to_empty(/*button*/ ctx[36].class) + " svelte-1vmia"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*visible*/ ctx[21] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*visible*/ ctx[21]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*visible*/ 2097152) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let dispatch = createEventDispatcher();
    	let { transbg = "fade" } = $$props;
    	let { transinner = "scale" } = $$props;
    	let { transbgInOptions = { duration: 200 } } = $$props;
    	let { transbgOutOptions = { duration: 200 } } = $$props;
    	let { transinnerInOptions = { duration: 200 } } = $$props;
    	let { transinnerOutOptions = { duration: 200 } } = $$props;
    	let { buttons = [] } = $$props;

    	//Set dynamic transitions
    	let transbgFunc, transinnerFunc;

    	switch (transbg) {
    		case "fade":
    			transbgFunc = fade;
    			break;
    		case "scale":
    			transbgFunc = scale;
    			break;
    		case "fly":
    			transbgFunc = fly;
    			break;
    		case "slide":
    			transbgFunc = slide;
    			break;
    	}

    	switch (transinner) {
    		case "fade":
    			transinnerFunc = fade;
    			break;
    		case "scale":
    			transinnerFunc = scale;
    			break;
    		case "fly":
    			transinnerFunc = fly;
    			break;
    		case "slide":
    			transinnerFunc = slide;
    			break;
    	}

    	let { loading = false } = $$props;
    	let { loadpos = "modal-load-top-right" } = $$props;
    	let { loadiconwidth = "4rem" } = $$props;
    	let { loadiconpath = "/icons/loading.svg" } = $$props;
    	let { loadingtext = "" } = $$props;
    	let { fadeonload = false } = $$props;
    	let { closable = true } = $$props;
    	let { closepos = "modal-closer-right" } = $$props;
    	let { bgclose = false } = $$props;
    	let { heading = "" } = $$props;
    	let { bgcolor = "rgba(0,0,0,.7)" } = $$props;
    	let { innerbg = "white" } = $$props;
    	let { wide = false } = $$props;
    	let { fullwidth = false } = $$props;
    	let { zindex = 25 } = $$props;
    	let { borderradius = "5px" } = $$props;
    	let { topoffset = "0" } = $$props;
    	let { visible = true } = $$props;
    	let { content = "" } = $$props;

    	//Can emit close signal if set
    	function bgclick() {
    		if (!bgclose || !closable || loading) return;
    		dispatch("close");
    	}

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function click_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler_2 = () => {
    		dispatch("close");
    	};

    	const click_handler_3 = button => dispatch(button.event);

    	$$self.$$set = $$props => {
    		if ("transbg" in $$props) $$invalidate(27, transbg = $$props.transbg);
    		if ("transinner" in $$props) $$invalidate(28, transinner = $$props.transinner);
    		if ("transbgInOptions" in $$props) $$invalidate(0, transbgInOptions = $$props.transbgInOptions);
    		if ("transbgOutOptions" in $$props) $$invalidate(1, transbgOutOptions = $$props.transbgOutOptions);
    		if ("transinnerInOptions" in $$props) $$invalidate(2, transinnerInOptions = $$props.transinnerInOptions);
    		if ("transinnerOutOptions" in $$props) $$invalidate(3, transinnerOutOptions = $$props.transinnerOutOptions);
    		if ("buttons" in $$props) $$invalidate(4, buttons = $$props.buttons);
    		if ("loading" in $$props) $$invalidate(5, loading = $$props.loading);
    		if ("loadpos" in $$props) $$invalidate(6, loadpos = $$props.loadpos);
    		if ("loadiconwidth" in $$props) $$invalidate(7, loadiconwidth = $$props.loadiconwidth);
    		if ("loadiconpath" in $$props) $$invalidate(8, loadiconpath = $$props.loadiconpath);
    		if ("loadingtext" in $$props) $$invalidate(9, loadingtext = $$props.loadingtext);
    		if ("fadeonload" in $$props) $$invalidate(10, fadeonload = $$props.fadeonload);
    		if ("closable" in $$props) $$invalidate(11, closable = $$props.closable);
    		if ("closepos" in $$props) $$invalidate(12, closepos = $$props.closepos);
    		if ("bgclose" in $$props) $$invalidate(29, bgclose = $$props.bgclose);
    		if ("heading" in $$props) $$invalidate(13, heading = $$props.heading);
    		if ("bgcolor" in $$props) $$invalidate(14, bgcolor = $$props.bgcolor);
    		if ("innerbg" in $$props) $$invalidate(15, innerbg = $$props.innerbg);
    		if ("wide" in $$props) $$invalidate(16, wide = $$props.wide);
    		if ("fullwidth" in $$props) $$invalidate(17, fullwidth = $$props.fullwidth);
    		if ("zindex" in $$props) $$invalidate(18, zindex = $$props.zindex);
    		if ("borderradius" in $$props) $$invalidate(19, borderradius = $$props.borderradius);
    		if ("topoffset" in $$props) $$invalidate(20, topoffset = $$props.topoffset);
    		if ("visible" in $$props) $$invalidate(21, visible = $$props.visible);
    		if ("content" in $$props) $$invalidate(22, content = $$props.content);
    		if ("$$scope" in $$props) $$invalidate(30, $$scope = $$props.$$scope);
    	};

    	return [
    		transbgInOptions,
    		transbgOutOptions,
    		transinnerInOptions,
    		transinnerOutOptions,
    		buttons,
    		loading,
    		loadpos,
    		loadiconwidth,
    		loadiconpath,
    		loadingtext,
    		fadeonload,
    		closable,
    		closepos,
    		heading,
    		bgcolor,
    		innerbg,
    		wide,
    		fullwidth,
    		zindex,
    		borderradius,
    		topoffset,
    		visible,
    		content,
    		transbgFunc,
    		transinnerFunc,
    		dispatch,
    		bgclick,
    		transbg,
    		transinner,
    		bgclose,
    		$$scope,
    		slots,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				transbg: 27,
    				transinner: 28,
    				transbgInOptions: 0,
    				transbgOutOptions: 1,
    				transinnerInOptions: 2,
    				transinnerOutOptions: 3,
    				buttons: 4,
    				loading: 5,
    				loadpos: 6,
    				loadiconwidth: 7,
    				loadiconpath: 8,
    				loadingtext: 9,
    				fadeonload: 10,
    				closable: 11,
    				closepos: 12,
    				bgclose: 29,
    				heading: 13,
    				bgcolor: 14,
    				innerbg: 15,
    				wide: 16,
    				fullwidth: 17,
    				zindex: 18,
    				borderradius: 19,
    				topoffset: 20,
    				visible: 21,
    				content: 22
    			},
    			[-1, -1]
    		);
    	}
    }

    return Modal;

})));
//# sourceMappingURL=modal.js.map
