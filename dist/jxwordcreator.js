
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var jxwordcreator = (function () {
    'use strict';

    function noop() { }
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function create_component(block) {
        block && block.c();
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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

    /* src/Menu.svelte generated by Svelte v3.46.4 */

    function create_fragment$5(ctx) {
    	let main;
    	let nav;
    	let div;
    	let input;
    	let t0;
    	let span0;
    	let t1;
    	let span1;
    	let t2;
    	let span2;
    	let t3;
    	let ul;
    	let a;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			main = element("main");
    			nav = element("nav");
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			span0 = element("span");
    			t1 = space();
    			span1 = element("span");
    			t2 = space();
    			span2 = element("span");
    			t3 = space();
    			ul = element("ul");
    			a = element("a");
    			a.innerHTML = `<li class="svelte-1c7c9b2">Reset</li>`;
    			attr(input, "type", "checkbox");
    			attr(input, "class", "svelte-1c7c9b2");
    			attr(span0, "class", "jxword-hamberder svelte-1c7c9b2");
    			attr(span1, "class", "jxword-hamberder svelte-1c7c9b2");
    			attr(span2, "class", "jxword-hamberder svelte-1c7c9b2");
    			attr(a, "href", "#");
    			attr(a, "class", "jxword-button svelte-1c7c9b2");
    			attr(ul, "class", "jxword-menu svelte-1c7c9b2");
    			attr(div, "class", "jxword-menu-toggle svelte-1c7c9b2");
    			attr(nav, "class", "jxword-controls");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, nav);
    			append(nav, div);
    			append(div, input);
    			input.checked = /*showMenu*/ ctx[0];
    			append(div, t0);
    			append(div, span0);
    			append(div, t1);
    			append(div, span1);
    			append(div, t2);
    			append(div, span2);
    			append(div, t3);
    			append(div, ul);
    			append(ul, a);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_handler*/ ctx[2]),
    					listen(a, "click", /*handleReset*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*showMenu*/ 1) {
    				input.checked = /*showMenu*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let showMenu = false;

    	function handleReset(e) {
    		e.preventDefault();
    		dispatch('reset');
    		$$invalidate(0, showMenu = false);
    	}

    	function input_change_handler() {
    		showMenu = this.checked;
    		$$invalidate(0, showMenu);
    	}

    	return [showMenu, handleReset, input_change_handler];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const isEditingQuestion = writable(false);
    const questionsAcross = writable([]);
    const questionsDown = writable([]);

    /* src/Question.svelte generated by Svelte v3.46.4 */

    function create_else_block$1(ctx) {
    	let div;
    	let t0_value = /*question*/ ctx[0].num + "";
    	let t0;
    	let t1;
    	let t2_value = (/*question*/ ctx[0].question || "No question set") + "";
    	let t2;
    	let t3;
    	let t4_value = /*question*/ ctx[0].answer + "";
    	let t4;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = text(" ~ ");
    			t4 = text(t4_value);
    			attr(div, "class", "jxword-question svelte-1trgq9y");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    			append(div, t3);
    			append(div, t4);

    			if (!mounted) {
    				dispose = listen(div, "dblclick", function () {
    					if (is_function(/*editQuestion*/ ctx[1](/*question*/ ctx[0]))) /*editQuestion*/ ctx[1](/*question*/ ctx[0]).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*question*/ 1 && t0_value !== (t0_value = /*question*/ ctx[0].num + "")) set_data(t0, t0_value);
    			if (dirty & /*question*/ 1 && t2_value !== (t2_value = (/*question*/ ctx[0].question || "No question set") + "")) set_data(t2, t2_value);
    			if (dirty & /*question*/ 1 && t4_value !== (t4_value = /*question*/ ctx[0].answer + "")) set_data(t4, t4_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (40:4) {#if question.editing}
    function create_if_block$1(ctx) {
    	let div3;
    	let div0;
    	let span;
    	let t0_value = /*question*/ ctx[0].num + "";
    	let t0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let input1;
    	let t3;
    	let div2;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "Save";
    			attr(div0, "class", "jxword-question-number");
    			attr(input0, "type", "text");
    			attr(input0, "class", "jxword-question-text");
    			input0.autofocus = true;
    			attr(input1, "type", "text");
    			attr(input1, "class", "jxword-question-text");
    			attr(div1, "class", "jxword-question-answer");
    			attr(div2, "class", "btn svelte-1trgq9y");
    			attr(div3, "class", "jxword-question jxword-question-editing svelte-1trgq9y");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div0, span);
    			append(span, t0);
    			append(div3, t1);
    			append(div3, input0);
    			set_input_value(input0, /*question*/ ctx[0].question);
    			append(div3, t2);
    			append(div3, div1);
    			append(div1, input1);
    			set_input_value(input1, /*question*/ ctx[0].answer);
    			append(div3, t3);
    			append(div3, div2);
    			input0.focus();

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen(input0, "keydown", /*handleKeydown*/ ctx[3]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen(div2, "click", function () {
    						if (is_function(/*saveQuestion*/ ctx[2](/*question*/ ctx[0]))) /*saveQuestion*/ ctx[2](/*question*/ ctx[0]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*question*/ 1 && t0_value !== (t0_value = /*question*/ ctx[0].num + "")) set_data(t0, t0_value);

    			if (dirty & /*question*/ 1 && input0.value !== /*question*/ ctx[0].question) {
    				set_input_value(input0, /*question*/ ctx[0].question);
    			}

    			if (dirty & /*question*/ 1 && input1.value !== /*question*/ ctx[0].answer) {
    				set_input_value(input1, /*question*/ ctx[0].answer);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let main;

    	function select_block_type(ctx, dirty) {
    		if (/*question*/ ctx[0].editing) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			main = element("main");
    			if_block.c();
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			if_block.m(main, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    			if_block.d();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { question } = $$props;
    	let { direction } = $$props;
    	const dispatch = createEventDispatcher();
    	let { questions_across = [] } = $$props;
    	let { questions_down = [] } = $$props;

    	function editQuestion(question) {
    		question.editing = true;
    		isEditingQuestion.set(true);

    		if (direction == "across") {
    			questionsAcross.set(questions_across);
    		} else {
    			questionsDown.set(questions_down);
    		}
    	}

    	function saveQuestion(question) {
    		if (direction == "across") {
    			questionsAcross.set(questions_across);
    		} else {
    			questionsDown.set(questions_down);
    		}

    		isEditingQuestion.set(false);
    		question.editing = false;
    		dispatch("save", { question, direction });
    		dispatch("change");
    	}

    	function handleKeydown(e) {
    		if (e.key == "Enter") {
    			saveQuestion(question);
    		}
    	}

    	function input0_input_handler() {
    		question.question = this.value;
    		$$invalidate(0, question);
    	}

    	function input1_input_handler() {
    		question.answer = this.value;
    		$$invalidate(0, question);
    	}

    	$$self.$$set = $$props => {
    		if ('question' in $$props) $$invalidate(0, question = $$props.question);
    		if ('direction' in $$props) $$invalidate(4, direction = $$props.direction);
    		if ('questions_across' in $$props) $$invalidate(5, questions_across = $$props.questions_across);
    		if ('questions_down' in $$props) $$invalidate(6, questions_down = $$props.questions_down);
    	};

    	return [
    		question,
    		editQuestion,
    		saveQuestion,
    		handleKeydown,
    		direction,
    		questions_across,
    		questions_down,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Question extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {
    			question: 0,
    			direction: 4,
    			questions_across: 5,
    			questions_down: 6
    		});
    	}
    }

    /* src/Questions.svelte generated by Svelte v3.46.4 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (5:16) {#each questions_across as question}
    function create_each_block_1$1(ctx) {
    	let question;
    	let current;

    	question = new Question({
    			props: {
    				question: /*question*/ ctx[4],
    				direction: "across",
    				questions_across: /*questions_across*/ ctx[0]
    			}
    		});

    	question.$on("change", /*change_handler*/ ctx[2]);

    	return {
    		c() {
    			create_component(question.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(question, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const question_changes = {};
    			if (dirty & /*questions_across*/ 1) question_changes.question = /*question*/ ctx[4];
    			if (dirty & /*questions_across*/ 1) question_changes.questions_across = /*questions_across*/ ctx[0];
    			question.$set(question_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(question.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(question.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(question, detaching);
    		}
    	};
    }

    // (11:16) {#each questions_down as question}
    function create_each_block$1(ctx) {
    	let question;
    	let current;

    	question = new Question({
    			props: {
    				question: /*question*/ ctx[4],
    				direction: "down",
    				questions_down: /*questions_down*/ ctx[1]
    			}
    		});

    	question.$on("change", /*change_handler_1*/ ctx[3]);

    	return {
    		c() {
    			create_component(question.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(question, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const question_changes = {};
    			if (dirty & /*questions_down*/ 2) question_changes.question = /*question*/ ctx[4];
    			if (dirty & /*questions_down*/ 2) question_changes.questions_down = /*questions_down*/ ctx[1];
    			question.$set(question_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(question.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(question.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(question, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let main;
    	let div2;
    	let div0;
    	let h40;
    	let t1;
    	let t2;
    	let div1;
    	let h41;
    	let t4;
    	let current;
    	let each_value_1 = /*questions_across*/ ctx[0];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*questions_down*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			main = element("main");
    			div2 = element("div");
    			div0 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Across";
    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Down";
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "jxword-questions-direction jxword-questions-across svelte-1jm0aq5");
    			attr(div1, "class", "jxword-questions-direction jxword-questions-across svelte-1jm0aq5");
    			attr(div2, "class", "jxword-questions svelte-1jm0aq5");
    			attr(main, "class", "svelte-1jm0aq5");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div2);
    			append(div2, div0);
    			append(div0, h40);
    			append(div0, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append(div2, t2);
    			append(div2, div1);
    			append(div1, h41);
    			append(div1, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*questions_across*/ 1) {
    				each_value_1 = /*questions_across*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*questions_down*/ 2) {
    				each_value = /*questions_down*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let questions_across = [];
    	let questions_down = [];

    	questionsAcross.subscribe(value => {
    		$$invalidate(0, questions_across = value);
    	});

    	questionsDown.subscribe(value => {
    		$$invalidate(1, questions_down = value);
    	});

    	function change_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function change_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	return [questions_across, questions_down, change_handler, change_handler_1];
    }

    class Questions extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src/Grid.svelte generated by Svelte v3.46.4 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[52] = list[i];
    	child_ctx[54] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[55] = list[i];
    	child_ctx[57] = i;
    	return child_ctx;
    }

    // (392:28) {:else}
    function create_else_block(ctx) {
    	let rect;
    	let rect_y_value;
    	let rect_x_value;
    	let text_1;
    	let t_value = /*letter*/ ctx[55] + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			rect = svg_element("rect");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(rect, "class", "jxword-cell-rect svelte-1txnct7");
    			attr(rect, "role", "cell");
    			attr(rect, "tabindex", "-1");
    			attr(rect, "aria-label", "");
    			attr(rect, "y", rect_y_value = /*cellWidth*/ ctx[16] * /*y*/ ctx[54] + /*margin*/ ctx[7]);
    			attr(rect, "x", rect_x_value = /*cellHeight*/ ctx[20] * /*x*/ ctx[57] + /*margin*/ ctx[7]);
    			attr(rect, "width", /*cellWidth*/ ctx[16]);
    			attr(rect, "height", /*cellHeight*/ ctx[20]);
    			attr(rect, "stroke", /*innerBorderColour*/ ctx[9]);
    			attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[6]);
    			attr(rect, "fill", /*backgroundColour*/ ctx[11]);
    			attr(rect, "data-col", /*x*/ ctx[57]);
    			attr(rect, "data-row", /*y*/ ctx[54]);
    			attr(text_1, "id", "jxword-letter-" + /*x*/ ctx[57] + "-" + /*y*/ ctx[54]);
    			attr(text_1, "x", text_1_x_value = /*cellWidth*/ ctx[16] * /*x*/ ctx[57] + /*margin*/ ctx[7] + /*cellWidth*/ ctx[16] / 2);
    			attr(text_1, "y", text_1_y_value = /*cellHeight*/ ctx[20] * /*y*/ ctx[54] + /*margin*/ ctx[7] + /*cellHeight*/ ctx[20] - /*cellHeight*/ ctx[20] * 0.1);
    			attr(text_1, "text-anchor", "middle");
    			attr(text_1, "font-size", /*fontSize*/ ctx[18]);
    			attr(text_1, "width", /*cellWidth*/ ctx[16]);
    			attr(text_1, "class", "svelte-1txnct7");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    			insert(target, text_1, anchor);
    			append(text_1, t);

    			if (!mounted) {
    				dispose = [listen(rect, "focus", handleFocus), listen(text_1, "focus", handleFocus)];
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*cellWidth, margin*/ 65664 && rect_y_value !== (rect_y_value = /*cellWidth*/ ctx[16] * /*y*/ ctx[54] + /*margin*/ ctx[7])) {
    				attr(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*cellHeight, margin*/ 1048704 && rect_x_value !== (rect_x_value = /*cellHeight*/ ctx[20] * /*x*/ ctx[57] + /*margin*/ ctx[7])) {
    				attr(rect, "x", rect_x_value);
    			}

    			if (dirty[0] & /*cellWidth*/ 65536) {
    				attr(rect, "width", /*cellWidth*/ ctx[16]);
    			}

    			if (dirty[0] & /*cellHeight*/ 1048576) {
    				attr(rect, "height", /*cellHeight*/ ctx[20]);
    			}

    			if (dirty[0] & /*innerBorderColour*/ 512) {
    				attr(rect, "stroke", /*innerBorderColour*/ ctx[9]);
    			}

    			if (dirty[0] & /*innerBorderWidth*/ 64) {
    				attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[6]);
    			}

    			if (dirty[0] & /*backgroundColour*/ 2048) {
    				attr(rect, "fill", /*backgroundColour*/ ctx[11]);
    			}

    			if (dirty[0] & /*grid*/ 1 && t_value !== (t_value = /*letter*/ ctx[55] + "")) set_data(t, t_value);

    			if (dirty[0] & /*cellWidth, margin*/ 65664 && text_1_x_value !== (text_1_x_value = /*cellWidth*/ ctx[16] * /*x*/ ctx[57] + /*margin*/ ctx[7] + /*cellWidth*/ ctx[16] / 2)) {
    				attr(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*cellHeight, margin*/ 1048704 && text_1_y_value !== (text_1_y_value = /*cellHeight*/ ctx[20] * /*y*/ ctx[54] + /*margin*/ ctx[7] + /*cellHeight*/ ctx[20] - /*cellHeight*/ ctx[20] * 0.1)) {
    				attr(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*fontSize*/ 262144) {
    				attr(text_1, "font-size", /*fontSize*/ ctx[18]);
    			}

    			if (dirty[0] & /*cellWidth*/ 65536) {
    				attr(text_1, "width", /*cellWidth*/ ctx[16]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    			if (detaching) detach(text_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (390:28) {#if letter=="#"}
    function create_if_block_1(ctx) {
    	let rect;
    	let rect_y_value;
    	let rect_x_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "class", "jxword-cell-rect svelte-1txnct7");
    			attr(rect, "role", "cell");
    			attr(rect, "tabindex", "-1");
    			attr(rect, "aria-label", "");
    			attr(rect, "y", rect_y_value = /*cellWidth*/ ctx[16] * /*y*/ ctx[54] + /*margin*/ ctx[7]);
    			attr(rect, "x", rect_x_value = /*cellHeight*/ ctx[20] * /*x*/ ctx[57] + /*margin*/ ctx[7]);
    			attr(rect, "width", /*cellWidth*/ ctx[16]);
    			attr(rect, "height", /*cellHeight*/ ctx[20]);
    			attr(rect, "stroke", /*innerBorderColour*/ ctx[9]);
    			attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[6]);
    			attr(rect, "fill", /*fillColour*/ ctx[10]);
    			attr(rect, "data-col", /*y*/ ctx[54]);
    			attr(rect, "data-row", /*x*/ ctx[57]);
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);

    			if (!mounted) {
    				dispose = listen(rect, "focus", handleFocus);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*cellWidth, margin*/ 65664 && rect_y_value !== (rect_y_value = /*cellWidth*/ ctx[16] * /*y*/ ctx[54] + /*margin*/ ctx[7])) {
    				attr(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*cellHeight, margin*/ 1048704 && rect_x_value !== (rect_x_value = /*cellHeight*/ ctx[20] * /*x*/ ctx[57] + /*margin*/ ctx[7])) {
    				attr(rect, "x", rect_x_value);
    			}

    			if (dirty[0] & /*cellWidth*/ 65536) {
    				attr(rect, "width", /*cellWidth*/ ctx[16]);
    			}

    			if (dirty[0] & /*cellHeight*/ 1048576) {
    				attr(rect, "height", /*cellHeight*/ ctx[20]);
    			}

    			if (dirty[0] & /*innerBorderColour*/ 512) {
    				attr(rect, "stroke", /*innerBorderColour*/ ctx[9]);
    			}

    			if (dirty[0] & /*innerBorderWidth*/ 64) {
    				attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[6]);
    			}

    			if (dirty[0] & /*fillColour*/ 1024) {
    				attr(rect, "fill", /*fillColour*/ ctx[10]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (396:28) {#if (number_grid[y][x] != null)}
    function create_if_block(ctx) {
    	let text_1;
    	let t_value = /*number_grid*/ ctx[15][/*y*/ ctx[54]][/*x*/ ctx[57]] + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(text_1, "x", text_1_x_value = /*cellWidth*/ ctx[16] * /*x*/ ctx[57] + /*margin*/ ctx[7] + 2);
    			attr(text_1, "y", text_1_y_value = /*cellHeight*/ ctx[20] * /*y*/ ctx[54] + /*margin*/ ctx[7] + /*numFontSize*/ ctx[19]);
    			attr(text_1, "text-anchor", "left");
    			attr(text_1, "font-size", /*numFontSize*/ ctx[19]);
    			attr(text_1, "class", "svelte-1txnct7");
    		},
    		m(target, anchor) {
    			insert(target, text_1, anchor);
    			append(text_1, t);

    			if (!mounted) {
    				dispose = listen(text_1, "focus", handleFocus);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*number_grid*/ 32768 && t_value !== (t_value = /*number_grid*/ ctx[15][/*y*/ ctx[54]][/*x*/ ctx[57]] + "")) set_data(t, t_value);

    			if (dirty[0] & /*cellWidth, margin*/ 65664 && text_1_x_value !== (text_1_x_value = /*cellWidth*/ ctx[16] * /*x*/ ctx[57] + /*margin*/ ctx[7] + 2)) {
    				attr(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*cellHeight, margin, numFontSize*/ 1572992 && text_1_y_value !== (text_1_y_value = /*cellHeight*/ ctx[20] * /*y*/ ctx[54] + /*margin*/ ctx[7] + /*numFontSize*/ ctx[19])) {
    				attr(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*numFontSize*/ 524288) {
    				attr(text_1, "font-size", /*numFontSize*/ ctx[19]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(text_1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (388:20) {#each col_data as letter, x}
    function create_each_block_1(ctx) {
    	let g;
    	let if_block0_anchor;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*letter*/ ctx[55] == "#") return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*number_grid*/ ctx[15][/*y*/ ctx[54]][/*x*/ ctx[57]] != null && create_if_block(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[39](/*x*/ ctx[57], /*y*/ ctx[54]);
    	}

    	function dblclick_handler() {
    		return /*dblclick_handler*/ ctx[40](/*x*/ ctx[57], /*y*/ ctx[54]);
    	}

    	return {
    		c() {
    			g = svg_element("g");
    			if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			attr(g, "id", "jxword-cell-" + /*x*/ ctx[57] + "-" + /*y*/ ctx[54]);
    			attr(g, "class", "jxword-cell svelte-1txnct7");
    			set_style(g, "z-index", "20");
    			toggle_class(g, "selected", /*current_y*/ ctx[2] === /*y*/ ctx[54] && /*current_x*/ ctx[1] === /*x*/ ctx[57]);
    			toggle_class(g, "active", /*marked_word_grid*/ ctx[17][/*y*/ ctx[54]][/*x*/ ctx[57]]);
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);
    			if_block0.m(g, null);
    			append(g, if_block0_anchor);
    			if (if_block1) if_block1.m(g, null);

    			if (!mounted) {
    				dispose = [
    					listen(g, "click", click_handler),
    					listen(g, "dblclick", dblclick_handler),
    					listen(g, "keydown", /*handleKeydown*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(g, if_block0_anchor);
    				}
    			}

    			if (/*number_grid*/ ctx[15][/*y*/ ctx[54]][/*x*/ ctx[57]] != null) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(g, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*current_y, current_x*/ 6) {
    				toggle_class(g, "selected", /*current_y*/ ctx[2] === /*y*/ ctx[54] && /*current_x*/ ctx[1] === /*x*/ ctx[57]);
    			}

    			if (dirty[0] & /*marked_word_grid*/ 131072) {
    				toggle_class(g, "active", /*marked_word_grid*/ ctx[17][/*y*/ ctx[54]][/*x*/ ctx[57]]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(g);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (387:16) {#each grid as col_data, y}
    function create_each_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*col_data*/ ctx[52];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*current_y, current_x, marked_word_grid, setCurrentPos, handleDoubleclick, handleKeydown, cellWidth, margin, cellHeight, numFontSize, number_grid, innerBorderColour, innerBorderWidth, fillColour, grid, fontSize, backgroundColour*/ 10481351) {
    				each_value_1 = /*col_data*/ ctx[52];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let svg;
    	let g;
    	let rect;
    	let t;
    	let questions;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*grid*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	questions = new Questions({});
    	questions.$on("change", /*change_handler*/ ctx[41]);

    	return {
    		c() {
    			main = element("main");
    			div = element("div");
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			rect = svg_element("rect");
    			t = space();
    			create_component(questions.$$.fragment);
    			attr(rect, "x", /*margin*/ ctx[7]);
    			attr(rect, "y", /*margin*/ ctx[7]);
    			attr(rect, "width", /*totalWidth*/ ctx[3]);
    			attr(rect, "height", /*totalHeight*/ ctx[4]);
    			attr(rect, "stroke", /*outerBorderColour*/ ctx[8]);
    			attr(rect, "stroke-width", /*outerBorderWidth*/ ctx[5]);
    			attr(rect, "fill", "none");
    			attr(rect, "class", "svelte-1txnct7");
    			attr(g, "class", "cell-group svelte-1txnct7");
    			attr(svg, "class", "jxword-svg svelte-1txnct7");
    			attr(svg, "min-x", "0");
    			attr(svg, "min-y", "0");
    			attr(svg, "width", /*viewbox_width*/ ctx[21]);
    			attr(svg, "height", /*viewbox_height*/ ctx[22]);
    			attr(div, "class", "jxword-svg-container svelte-1txnct7");
    			attr(main, "class", "svelte-1txnct7");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div);
    			append(div, svg);
    			append(svg, g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			append(g, rect);
    			append(main, t);
    			mount_component(questions, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(main, "move", /*handleMove*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*grid, current_y, current_x, marked_word_grid, setCurrentPos, handleDoubleclick, handleKeydown, cellWidth, margin, cellHeight, numFontSize, number_grid, innerBorderColour, innerBorderWidth, fillColour, fontSize, backgroundColour*/ 10481351) {
    				each_value = /*grid*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, rect);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty[0] & /*margin*/ 128) {
    				attr(rect, "x", /*margin*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*margin*/ 128) {
    				attr(rect, "y", /*margin*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*totalWidth*/ 8) {
    				attr(rect, "width", /*totalWidth*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*totalHeight*/ 16) {
    				attr(rect, "height", /*totalHeight*/ ctx[4]);
    			}

    			if (!current || dirty[0] & /*outerBorderColour*/ 256) {
    				attr(rect, "stroke", /*outerBorderColour*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*outerBorderWidth*/ 32) {
    				attr(rect, "stroke-width", /*outerBorderWidth*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*viewbox_width*/ 2097152) {
    				attr(svg, "width", /*viewbox_width*/ ctx[21]);
    			}

    			if (!current || dirty[0] & /*viewbox_height*/ 4194304) {
    				attr(svg, "height", /*viewbox_height*/ ctx[22]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(questions.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(questions.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_each(each_blocks, detaching);
    			destroy_component(questions);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function handleFocus(e) {
    	
    } //console.log(e);

    function instance$1($$self, $$props, $$invalidate) {
    	let $questionsDown;
    	let $questionsAcross;
    	component_subscribe($$self, questionsDown, $$value => $$invalidate(42, $questionsDown = $$value));
    	component_subscribe($$self, questionsAcross, $$value => $$invalidate(43, $questionsAcross = $$value));
    	const dispatch = createEventDispatcher();

    	// Private properties
    	let number_grid = [];

    	let marked_word_grid = [];
    	let fontSize;
    	let numFontSize;
    	let cellWidth;
    	let cellHeight;
    	let viewbox_width;
    	let viewbox_height;
    	let { size = 10 } = $$props;
    	let { current_x = 0 } = $$props;
    	let { current_y = 0 } = $$props;
    	let { grid = [] } = $$props;
    	let { current_direction = "across" } = $$props;
    	let { totalWidth = 500 } = $$props;
    	let { totalHeight = 500 } = $$props;
    	let { outerBorderWidth = 1.5 } = $$props;
    	let { innerBorderWidth = 1 } = $$props;
    	let { margin = 3 } = $$props;
    	let { outerBorderColour = "black" } = $$props;
    	let { innerBorderColour = "black" } = $$props;
    	let { fillColour = "black" } = $$props;
    	let { backgroundColour = "white" } = $$props;
    	const fontRatio = 0.7;
    	const numRatio = 0.33;

    	function selectCell(e) {
    		$$invalidate(1, current_x = e.srcElement.getAttribute("data-col"));
    		$$invalidate(2, current_y = e.srcElement.getAttribute("data-row"));
    		drawMarkedWordGrid();
    		dispatch("change");
    	}

    	function isStartOfAcross(x, y) {
    		if (grid[y][x] === "#") return false;
    		if (x >= size) return false;
    		let word = getWord(x, y, "across");
    		if (word.length <= 1) return false;
    		return x === 0 || grid[y][x - 1] == "#";
    	}

    	function isStartOfDown(x, y) {
    		if (grid[y][x] === "#") return false;
    		if (y >= size) return false;
    		let word = getWord(x, y, "down");
    		if (word.length <= 1) return false;
    		return y === 0 || grid[y - 1][x] == "#";
    	}

    	function getQuestion(num, x, y, direction, question) {
    		const answer = getWord(x, y, direction);

    		if (direction === "across") {
    			for (let i = 0; i < $questionsAcross.length; i++) {
    				if ($questionsAcross[i].answer === answer && $questionsAcross[i].direction === direction) {
    					return { ...$questionsAcross[i], answer, num };
    				}

    				if ($questionsAcross[i].num === num && $questionsAcross[i].direction === direction) {
    					return { ...$questionsAcross[i], answer };
    				}
    			}

    			return {
    				num,
    				x,
    				y,
    				question,
    				answer,
    				editing: false,
    				direction
    			};
    		} else {
    			for (let i = 0; i < $questionsDown.length; i++) {
    				if ($questionsDown[i].answer === answer && $questionsDown[i].direction === direction) {
    					return { ...$questionsDown[i], answer, num };
    				}

    				if ($questionsDown[i].num === num && $questionsDown[i].direction === direction) {
    					return set_store_value(questionsDown, $questionsDown[i] = { ...$questionsDown[i], answer }, $questionsDown);
    				}
    			}

    			return set_store_value(
    				questionsDown,
    				$questionsDown = {
    					num,
    					x,
    					y,
    					question,
    					answer,
    					editing: false,
    					direction
    				},
    				$questionsDown
    			);
    		}
    	}

    	function getStartOfWord(x, y, direction) {
    		if (direction === "across") {
    			while (x > 0 && grid[y][x - 1] !== "#") {
    				x--;
    			}
    		} else {
    			while (y > 0 && grid[y - 1][x] !== "#") {
    				y--;
    			}
    		}

    		return { x, y };
    	}

    	function getEndOfWord(x, y, direction) {
    		if (direction === "across") {
    			while (x < size - 1 && grid[y][x + 1] !== "#") {
    				x++;
    			}
    		} else {
    			while (y < size - 1 && grid[y + 1][x] !== "#") {
    				y++;
    			}
    		}

    		return { x, y };
    	}

    	function getWord(x, y, direction) {
    		let start = getStartOfWord(x, y, direction);
    		let end = getEndOfWord(x, y, direction);
    		let word = "";

    		if (direction === "across") {
    			for (let i = start.x; i <= end.x; i++) {
    				word += grid[y][i];
    			}
    		} else {
    			for (let i = start.y; i <= end.y; i++) {
    				word += grid[i][x];
    			}
    		}

    		return word;
    	}

    	function drawMarkedWordGrid() {
    		$$invalidate(17, marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false)));

    		if (current_direction === "across") {
    			for (let x = current_x; x < size; x++) {
    				if (grid[current_y][x] === "#") {
    					break;
    				}

    				$$invalidate(17, marked_word_grid[current_y][x] = true, marked_word_grid);
    			}

    			for (let x = current_x; x >= 0; x--) {
    				if (grid[current_y][x] === "#") {
    					break;
    				}

    				$$invalidate(17, marked_word_grid[current_y][x] = true, marked_word_grid);
    			}
    		} else {
    			// down
    			for (let y = current_y; y < size; y++) {
    				if (grid[y][current_x] === "#") {
    					break;
    				}

    				$$invalidate(17, marked_word_grid[y][current_x] = true, marked_word_grid);
    			}

    			for (let y = current_y; y >= 0; y--) {
    				if (grid[y][current_x] === "#") {
    					break;
    				}

    				$$invalidate(17, marked_word_grid[y][current_x] = true, marked_word_grid);
    			}
    		}
    	}

    	function moveUp() {
    		if (current_y > 0) {
    			$$invalidate(2, current_y--, current_y);
    			dispatch("change");
    			drawMarkedWordGrid();
    		}
    	}

    	function moveDown() {
    		if (current_y < size - 1) {
    			$$invalidate(2, current_y++, current_y);
    			dispatch("change");
    			drawMarkedWordGrid();
    		}
    	}

    	function moveLeft() {
    		if (current_x > 0) {
    			$$invalidate(1, current_x--, current_x);
    			dispatch("change");
    			drawMarkedWordGrid();
    		}
    	}

    	function moveRight() {
    		if (current_x < size - 1) {
    			$$invalidate(1, current_x++, current_x);
    			dispatch("change");
    			drawMarkedWordGrid();
    		}
    	}

    	function moveStartOfRow() {
    		$$invalidate(1, current_x = 0);
    		dispatch("change");
    		drawMarkedWordGrid();
    	}

    	function moveEndOfRow() {
    		$$invalidate(1, current_x = size - 1);
    		dispatch("change");
    		drawMarkedWordGrid();
    	}

    	function handleMove(dir) {
    		if (dir === "up") {
    			moveUp();
    		}

    		if (dir === "down") {
    			moveDown();
    		}

    		if (dir === "left") {
    			moveLeft();
    		}

    		if (dir === "right") {
    			moveRight();
    		}

    		if (dir === "backsapce") {
    			backspace();
    		}
    	}

    	function toggleDir() {
    		if (current_direction === "across") {
    			$$invalidate(24, current_direction = "down");
    		} else {
    			$$invalidate(24, current_direction = "across");
    		}

    		dispatch("change");
    		drawMarkedWordGrid();
    	}

    	function setDir(direction) {
    		if (direction === "across") {
    			$$invalidate(24, current_direction = "across");
    		} else {
    			$$invalidate(24, current_direction = "down");
    		}

    		dispatch("change");
    		drawMarkedWordGrid();
    	}

    	function getDir() {
    		return current_direction;
    	}

    	function getCurrentPos() {
    		return { x: current_x, y: current_y };
    	}

    	function setCurrentPos(x, y) {
    		$$invalidate(1, current_x = x);
    		$$invalidate(2, current_y = y);
    		dispatch("change");
    		drawMarkedWordGrid();
    	}

    	function handleDoubleclick(x, y) {
    		toggleDir();
    	} // let selected_question;
    	// let questions = current_direction === "across" ? $questionsAcross : $questionsDown;

    	function handleKeydown(e) {
    		// if (is_editing_question) return;
    		const keycode = e.keyCode;

    		if (e.metaKey) return;

    		if (keycode > 64 && keycode < 91) {
    			dispatch("letter", e.key.toUpperCase());
    		} else if (keycode === 51) {
    			// #
    			dispatch("letter", "#");
    		} else if (keycode === 8) {
    			// Backspace
    			e.preventDefault();

    			dispatch("backspace");
    		} else if (keycode == 32) {
    			// Space
    			e.preventDefault();

    			dispatch("move", "next");
    		} else if (keycode === 9) {
    			// Enter
    			e.preventDefault();

    			if (e.shiftKey) {
    				dispatch("move", "prev-word");
    			} else {
    				dispatch("move", "next-word");
    			}
    		} else if (keycode === 13) {
    			// Enter
    			dispatch("enter");
    		} else if (keycode === 37) {
    			e.preventDefault();
    			dispatch("move", "left");
    		} else if (keycode === 38) {
    			e.preventDefault();
    			dispatch("move", "up");
    		} else if (keycode === 39) {
    			e.preventDefault();
    			dispatch("move", "right");
    		} else if (keycode === 40) {
    			e.preventDefault();
    			dispatch("move", "down");
    		}
    	}

    	const click_handler = (x, y) => {
    		setCurrentPos(x, y);
    	};

    	const dblclick_handler = (x, y) => {
    		handleDoubleclick();
    	};

    	function change_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(25, size = $$props.size);
    		if ('current_x' in $$props) $$invalidate(1, current_x = $$props.current_x);
    		if ('current_y' in $$props) $$invalidate(2, current_y = $$props.current_y);
    		if ('grid' in $$props) $$invalidate(0, grid = $$props.grid);
    		if ('current_direction' in $$props) $$invalidate(24, current_direction = $$props.current_direction);
    		if ('totalWidth' in $$props) $$invalidate(3, totalWidth = $$props.totalWidth);
    		if ('totalHeight' in $$props) $$invalidate(4, totalHeight = $$props.totalHeight);
    		if ('outerBorderWidth' in $$props) $$invalidate(5, outerBorderWidth = $$props.outerBorderWidth);
    		if ('innerBorderWidth' in $$props) $$invalidate(6, innerBorderWidth = $$props.innerBorderWidth);
    		if ('margin' in $$props) $$invalidate(7, margin = $$props.margin);
    		if ('outerBorderColour' in $$props) $$invalidate(8, outerBorderColour = $$props.outerBorderColour);
    		if ('innerBorderColour' in $$props) $$invalidate(9, innerBorderColour = $$props.innerBorderColour);
    		if ('fillColour' in $$props) $$invalidate(10, fillColour = $$props.fillColour);
    		if ('backgroundColour' in $$props) $$invalidate(11, backgroundColour = $$props.backgroundColour);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*totalWidth, margin, outerBorderWidth, totalHeight, size, cellWidth, grid, number_grid*/ 33652921) {
    			{
    				$$invalidate(21, viewbox_width = totalWidth + margin + outerBorderWidth);
    				$$invalidate(22, viewbox_height = totalHeight + margin + outerBorderWidth);
    				$$invalidate(16, cellWidth = totalWidth / size);
    				$$invalidate(20, cellHeight = totalHeight / size);
    				$$invalidate(18, fontSize = cellWidth * fontRatio);
    				$$invalidate(19, numFontSize = cellWidth * numRatio);
    				let questions_across = [];
    				let questions_down = [];
    				let num = 1;

    				if (grid.length - 1 < size) {
    					for (let i = 0; i < size; i++) {
    						$$invalidate(0, grid[i] = grid[i] || Array(size).map(() => " "), grid);
    						$$invalidate(15, number_grid[i] = number_grid[i] || Array(size).map(() => " "), number_grid);
    					}
    				}

    				while (grid.length > size) {
    					for (let i = 0; i < grid.length; i++) {
    						while (grid[i].length > size) {
    							grid[i].pop();
    							number_grid[i].pop();
    						}
    					}

    					grid.pop();
    					number_grid.pop();
    				}

    				for (let y = 0; y < size; y++) {
    					if (!number_grid[y]) {
    						$$invalidate(15, number_grid[y] = Array(size), number_grid);
    					}

    					for (let x = 0; x < size; x++) {
    						$$invalidate(0, grid[y][x] = grid[y][x] || " ", grid);
    						if (grid[y][x] === "#") continue;
    						let found = false;

    						if (isStartOfAcross(x, y)) {
    							questions_across.push(getQuestion(num, x, y, "across", ""));
    							found = true;
    						}

    						if (isStartOfDown(x, y)) {
    							questions_down.push(getQuestion(num, x, y, "down", ""));
    							found = true;
    						}

    						if (!found) {
    							$$invalidate(15, number_grid[y][x] = null, number_grid);
    						} else {
    							$$invalidate(15, number_grid[y][x] = num++, number_grid);
    						}
    					}
    				}

    				questions_across.sort();
    				questions_down.sort();
    				questionsAcross.set(questions_across);
    				questionsDown.set(questions_down);
    				drawMarkedWordGrid();
    			}
    		}
    	};

    	return [
    		grid,
    		current_x,
    		current_y,
    		totalWidth,
    		totalHeight,
    		outerBorderWidth,
    		innerBorderWidth,
    		margin,
    		outerBorderColour,
    		innerBorderColour,
    		fillColour,
    		backgroundColour,
    		handleMove,
    		setCurrentPos,
    		handleKeydown,
    		number_grid,
    		cellWidth,
    		marked_word_grid,
    		fontSize,
    		numFontSize,
    		cellHeight,
    		viewbox_width,
    		viewbox_height,
    		handleDoubleclick,
    		current_direction,
    		size,
    		fontRatio,
    		numRatio,
    		selectCell,
    		moveUp,
    		moveDown,
    		moveLeft,
    		moveRight,
    		moveStartOfRow,
    		moveEndOfRow,
    		toggleDir,
    		setDir,
    		getDir,
    		getCurrentPos,
    		click_handler,
    		dblclick_handler,
    		change_handler
    	];
    }

    class Grid extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				size: 25,
    				current_x: 1,
    				current_y: 2,
    				grid: 0,
    				current_direction: 24,
    				totalWidth: 3,
    				totalHeight: 4,
    				outerBorderWidth: 5,
    				innerBorderWidth: 6,
    				margin: 7,
    				outerBorderColour: 8,
    				innerBorderColour: 9,
    				fillColour: 10,
    				backgroundColour: 11,
    				fontRatio: 26,
    				numRatio: 27,
    				selectCell: 28,
    				moveUp: 29,
    				moveDown: 30,
    				moveLeft: 31,
    				moveRight: 32,
    				moveStartOfRow: 33,
    				moveEndOfRow: 34,
    				handleMove: 12,
    				toggleDir: 35,
    				setDir: 36,
    				getDir: 37,
    				getCurrentPos: 38,
    				setCurrentPos: 13,
    				handleKeydown: 14
    			},
    			null,
    			[-1, -1]
    		);
    	}

    	get fontRatio() {
    		return this.$$.ctx[26];
    	}

    	get numRatio() {
    		return this.$$.ctx[27];
    	}

    	get selectCell() {
    		return this.$$.ctx[28];
    	}

    	get moveUp() {
    		return this.$$.ctx[29];
    	}

    	get moveDown() {
    		return this.$$.ctx[30];
    	}

    	get moveLeft() {
    		return this.$$.ctx[31];
    	}

    	get moveRight() {
    		return this.$$.ctx[32];
    	}

    	get moveStartOfRow() {
    		return this.$$.ctx[33];
    	}

    	get moveEndOfRow() {
    		return this.$$.ctx[34];
    	}

    	get handleMove() {
    		return this.$$.ctx[12];
    	}

    	get toggleDir() {
    		return this.$$.ctx[35];
    	}

    	get setDir() {
    		return this.$$.ctx[36];
    	}

    	get getDir() {
    		return this.$$.ctx[37];
    	}

    	get getCurrentPos() {
    		return this.$$.ctx[38];
    	}

    	get setCurrentPos() {
    		return this.$$.ctx[13];
    	}

    	get handleKeydown() {
    		return this.$$.ctx[14];
    	}
    }

    /* src/Instructions.svelte generated by Svelte v3.46.4 */

    function create_fragment$1(ctx) {
    	let main;

    	return {
    		c() {
    			main = element("main");

    			main.innerHTML = `<p>Use &quot;#&quot; to create a blank square.</p> 
    <p>Double-click the question on the right to set an answer.</p> 
    <p>Hint: Complete the words before starting on the answers, because you might have to change something!</p> 
    <p>Note: This Crossword Creator is in Alpha. <a href="https://github.com/j-norwood-young/jxword-creator/issues">Please report bugs here</a>.</p>`;
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    		}
    	};
    }

    class Instructions extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    function saveState(state) {
        let stateString = JSON.stringify(state);
        localStorage.setItem('jxword-creator', stateString);
    }

    function restoreState() {
        let stateString = localStorage.getItem('jxword-creator');
        if (stateString) {
            let state = JSON.parse(stateString);
            return state;
        } else {
            return null;
        }
    }

    function clearState() {
        localStorage.clear();
    }

    const format_date = (date) => new Date(date).toISOString().slice(0, 10);

    function XDEncode(obj) {
        let str = "";
        if (obj.title) {
            str += `Title: ${obj.title}\n`;
        }
        if (obj.author) {
            str += `Author: ${obj.author}\n`;
        }
        if (obj.editor) {
            str += `Editor: ${obj.editor}\n`;
        }
        if (obj.date) {
            str += `Date: ${format_date(obj.date)}\n`;
        }
        str += `\n\n`;
        for (let y = 0; y < obj.grid.length; y++) {
            for(let x = 0; x < obj.grid[y].length; x++) {
                str += `${obj.grid[y][x]}`;
            }
            str += `\n`;
        }
        str += `\n\n`;
        for (let q of obj.questions_across) {
            str += `A${q.num}. ${q.question} ~ ${q.answer}\n`;
        }
        str += `\n`;
        for (let q of obj.questions_down) {
            str += `D${q.num}. ${q.question} ~ ${q.answer}\n`;
        }
        return str;
    }

    // A library for converting .xd Crossword data to JSON (as defined by Saul Pwanson - http://xd.saul.pw) written by Jason Norwood-Young

    function XDParser(data) {
        function processData(data) {
            // Split into parts
            let parts = data.split(/^$^$/gm).filter(s => s !== "\n");
            if (parts.length > 4) {
                // console.log(JSON.stringify(data));
                parts = data.split(/\r\n\r\n/g).filter(s => (s.trim()));
                for(let i = 0; i < parts.length; i++) {
                    parts[i] = parts[i].replace(/\r\n/g, "\n");
                }
            }
            if (parts.length !== 4) throw (`Too many parts - expected 4, found ${parts.length}`);
            const rawMeta = parts[0];
            const rawGrid = parts[1];
            const rawAcross = parts[2];
            const rawDown = parts[3];
            const meta = processMeta(rawMeta);
            const grid = processGrid(rawGrid);
            const across = processClues(rawAcross);
            const down = processClues(rawDown);
            return { meta, grid, across, down, rawGrid, rawAcross, rawDown, rawMeta, };
        }

        function processMeta(rawMeta) {
            const metaLines = rawMeta.split("\n").filter(s => (s) && s !== "\n");
            let meta = {};
            metaLines.forEach(metaLine => {
                const lineParts = metaLine.split(": ");
                meta[lineParts[0]] = lineParts[1];
            });
            return meta;
        }

        function processGrid(rawGrid) {
            let result = [];
            const lines = rawGrid.split("\n").filter(s => (s) && s !== "\n");
            for (let x = 0; x < lines.length; x++) {
                result[x] = lines[x].split("");
            }
            return result;
        }

        function processClues(rawClues) {
            let result = [];
            const lines = rawClues.split("\n").filter(s => (s) && s !== "\n");
            const regex = /(^.\d*)\.\s(.*)\s~\s(.*)/;
            for (let x = 0; x < lines.length; x++) {
                if (!lines[x].trim()) continue;
                const parts = lines[x].match(regex);
                if (parts.length !== 4) throw (`Could not parse question ${lines[x]}`);
                // Unescape string
                const question = parts[2].replace(/\\/g, "");
                result[x] = {
                    num: parts[1],
                    question: question,
                    answer: parts[3]
                };
            }
            return result;
        }

        return processData(data);
    }

    var xdCrosswordParser = XDParser;

    /* src/JXWordCreator.svelte generated by Svelte v3.46.4 */

    function create_fragment(ctx) {
    	let main;
    	let instructions;
    	let t0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let label2;
    	let t8;
    	let input2;
    	let t9;
    	let label3;
    	let t11;
    	let input3;
    	let t12;
    	let label4;
    	let t14;
    	let input4;
    	let t15;
    	let label5;
    	let t17;
    	let input5;
    	let t18;
    	let div1;
    	let div0;
    	let menu;
    	let t19;
    	let grid_1;
    	let t20;
    	let textarea;
    	let current;
    	let mounted;
    	let dispose;
    	instructions = new Instructions({});
    	menu = new Menu({});
    	menu.$on("reset", /*handleReset*/ ctx[14]);

    	let grid_1_props = {
    		size: /*size*/ ctx[7],
    		grid: /*grid*/ ctx[0]
    	};

    	grid_1 = new Grid({ props: grid_1_props });
    	/*grid_1_binding*/ ctx[22](grid_1);
    	grid_1.$on("change", /*handleStateChange*/ ctx[13]);
    	grid_1.$on("move", /*handleMove*/ ctx[9]);
    	grid_1.$on("letter", /*handleLetter*/ ctx[10]);
    	grid_1.$on("backspace", /*handleBackspace*/ ctx[12]);
    	grid_1.$on("enter", /*handleEnter*/ ctx[11]);

    	return {
    		c() {
    			main = element("main");
    			create_component(instructions.$$.fragment);
    			t0 = space();
    			label0 = element("label");
    			label0.textContent = "Upload an XD file (optional)";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "Title";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			label2 = element("label");
    			label2.textContent = "Author";
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			label3 = element("label");
    			label3.textContent = "Editor";
    			t11 = space();
    			input3 = element("input");
    			t12 = space();
    			label4 = element("label");
    			label4.textContent = "Date";
    			t14 = space();
    			input4 = element("input");
    			t15 = space();
    			label5 = element("label");
    			label5.textContent = "Size";
    			t17 = space();
    			input5 = element("input");
    			t18 = space();
    			div1 = element("div");
    			div0 = element("div");
    			create_component(menu.$$.fragment);
    			t19 = space();
    			create_component(grid_1.$$.fragment);
    			t20 = space();
    			textarea = element("textarea");
    			attr(label0, "for", "file");
    			attr(input0, "class", "drop_zone");
    			attr(input0, "type", "file");
    			attr(input0, "id", "file");
    			attr(input0, "name", "files");
    			attr(input0, "accept", ".xd");
    			attr(label1, "for", "title");
    			attr(input1, "id", "title");
    			attr(input1, "type", "text");
    			attr(label2, "for", "author");
    			attr(input2, "id", "author");
    			attr(input2, "type", "text");
    			attr(label3, "for", "editor");
    			attr(input3, "id", "editor");
    			attr(input3, "type", "text");
    			attr(label4, "for", "date");
    			attr(input4, "id", "date");
    			attr(input4, "type", "date");
    			attr(label5, "for", "size");
    			attr(input5, "type", "number");
    			attr(input5, "id", "size");
    			attr(input5, "placeholder", "size");
    			attr(input5, "default", "5");
    			attr(input5, "min", "1");
    			attr(div0, "class", "jxword-header");
    			attr(div1, "class", "jxword-container");
    			attr(textarea, "class", "jxword-xd-textarea svelte-wuybts");
    			attr(main, "class", "svelte-wuybts");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(instructions, main, null);
    			append(main, t0);
    			append(main, label0);
    			append(main, t2);
    			append(main, input0);
    			/*input0_binding*/ ctx[16](input0);
    			append(main, t3);
    			append(main, label1);
    			append(main, t5);
    			append(main, input1);
    			set_input_value(input1, /*title*/ ctx[2]);
    			append(main, t6);
    			append(main, label2);
    			append(main, t8);
    			append(main, input2);
    			set_input_value(input2, /*author*/ ctx[3]);
    			append(main, t9);
    			append(main, label3);
    			append(main, t11);
    			append(main, input3);
    			set_input_value(input3, /*editor*/ ctx[4]);
    			append(main, t12);
    			append(main, label4);
    			append(main, t14);
    			append(main, input4);
    			set_input_value(input4, /*date*/ ctx[5]);
    			append(main, t15);
    			append(main, label5);
    			append(main, t17);
    			append(main, input5);
    			set_input_value(input5, /*size*/ ctx[7]);
    			append(main, t18);
    			append(main, div1);
    			append(div1, div0);
    			mount_component(menu, div0, null);
    			append(div1, t19);
    			mount_component(grid_1, div1, null);
    			append(main, t20);
    			append(main, textarea);
    			set_input_value(textarea, /*xd*/ ctx[6]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input0, "change", /*handleFileSelect*/ ctx[15]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[17]),
    					listen(input1, "change", /*handleStateChange*/ ctx[13]),
    					listen(input2, "input", /*input2_input_handler*/ ctx[18]),
    					listen(input2, "change", /*handleStateChange*/ ctx[13]),
    					listen(input3, "input", /*input3_input_handler*/ ctx[19]),
    					listen(input3, "change", /*handleStateChange*/ ctx[13]),
    					listen(input4, "input", /*input4_input_handler*/ ctx[20]),
    					listen(input4, "change", /*handleStateChange*/ ctx[13]),
    					listen(input5, "input", /*input5_input_handler*/ ctx[21]),
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[23])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 4 && input1.value !== /*title*/ ctx[2]) {
    				set_input_value(input1, /*title*/ ctx[2]);
    			}

    			if (dirty & /*author*/ 8 && input2.value !== /*author*/ ctx[3]) {
    				set_input_value(input2, /*author*/ ctx[3]);
    			}

    			if (dirty & /*editor*/ 16 && input3.value !== /*editor*/ ctx[4]) {
    				set_input_value(input3, /*editor*/ ctx[4]);
    			}

    			if (dirty & /*date*/ 32) {
    				set_input_value(input4, /*date*/ ctx[5]);
    			}

    			if (dirty & /*size*/ 128 && to_number(input5.value) !== /*size*/ ctx[7]) {
    				set_input_value(input5, /*size*/ ctx[7]);
    			}

    			const grid_1_changes = {};
    			if (dirty & /*size*/ 128) grid_1_changes.size = /*size*/ ctx[7];
    			if (dirty & /*grid*/ 1) grid_1_changes.grid = /*grid*/ ctx[0];
    			grid_1.$set(grid_1_changes);

    			if (dirty & /*xd*/ 64) {
    				set_input_value(textarea, /*xd*/ ctx[6]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(instructions.$$.fragment, local);
    			transition_in(menu.$$.fragment, local);
    			transition_in(grid_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(instructions.$$.fragment, local);
    			transition_out(menu.$$.fragment, local);
    			transition_out(grid_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(instructions);
    			/*input0_binding*/ ctx[16](null);
    			destroy_component(menu);
    			/*grid_1_binding*/ ctx[22](null);
    			destroy_component(grid_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $questionsDown;
    	let $questionsAcross;
    	component_subscribe($$self, questionsDown, $$value => $$invalidate(25, $questionsDown = $$value));
    	component_subscribe($$self, questionsAcross, $$value => $$invalidate(26, $questionsAcross = $$value));
    	let gridComponent;
    	let title;
    	let author;
    	let editor;
    	let date;
    	let xd;

    	let { grid = [
    		["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    		["B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],
    		["C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    		["D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
    		["E", "F", "G", "H", "I", "J", "K", "L", "M", "N"],
    		["F", "G", "H", "I", "J", "K", "L", "M", "N", "O"],
    		["G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
    		["H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"],
    		["I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"],
    		["J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"]
    	] } = $$props;

    	let size = grid.length;

    	let state = {
    		grid,
    		size,
    		current_x: 0,
    		current_y: 0,
    		direction: "across"
    	};

    	let getState = () => {
    		let { x: current_x, y: current_y } = gridComponent.getCurrentPos();
    		let direction = gridComponent.getDir();

    		return {
    			grid,
    			size,
    			current_x,
    			current_y,
    			direction,
    			questions_across: $questionsAcross,
    			questions_down: $questionsDown,
    			title,
    			author,
    			editor,
    			date
    		};
    	};

    	function handleMove(event) {
    		const direction = event.detail;
    		const currentDir = gridComponent.getDir();
    		let newDir;

    		if (direction === "down" || direction === "up") {
    			newDir = "down";
    		}

    		if (direction === "left" || direction === "right") {
    			newDir = "across";
    		}

    		if (newDir !== currentDir) {
    			gridComponent.setDir(newDir);
    		} else {
    			gridComponent.handleMove(direction);
    		}
    	}

    	function handleLetter(event) {
    		const letter = event.detail;
    		let { x, y } = gridComponent.getCurrentPos();
    		$$invalidate(0, grid[y][x] = letter, grid);

    		if (gridComponent.getDir() === "across") {
    			gridComponent.moveRight();
    		} else {
    			gridComponent.moveDown();
    		}
    	}

    	function handleEnter(event) {
    		let { x, y } = gridComponent.getCurrentPos();
    		let current_direction = gridComponent.getDir();
    		let selected_question;

    		let questions = current_direction === "across"
    		? $questionsAcross
    		: $questionsDown;

    		if (current_direction === "across") {
    			selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);

    			if (selected_question) {
    				selected_question.editing = true;
    				set_store_value(questionsAcross, $questionsAcross = questions, $questionsAcross);
    			}
    		} else {
    			selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);

    			if (selected_question) {
    				selected_question.editing = true;
    				set_store_value(questionsDown, $questionsDown = questions, $questionsDown);
    			}
    		}
    	}

    	function handleBackspace(event) {
    		let { x, y } = gridComponent.getCurrentPos();
    		$$invalidate(0, grid[y][x] = "", grid);

    		if (gridComponent.getDir() === "across") {
    			gridComponent.moveLeft();
    		} else {
    			gridComponent.moveUp();
    		}
    	}

    	function handleStateChange() {
    		saveState(getState());
    		$$invalidate(6, xd = XDEncode(getState()));
    	}

    	onMount(() => {
    		state = restoreState();
    		$$invalidate(0, grid = state.grid);
    		$$invalidate(7, size = state.size);
    		$$invalidate(3, author = state.author);
    		$$invalidate(4, editor = state.editor);
    		$$invalidate(5, date = state.date);
    		$$invalidate(2, title = state.title);
    		questionsAcross.set(state.questions_across);
    		questionsDown.set(state.questions_down);
    		gridComponent.setDir(state.direction);
    		gridComponent.setCurrentPos(state.current_x, state.current_y);
    	});

    	function handleReset() {
    		clearState();
    		$$invalidate(7, size = 10);
    		gridComponent.setDir("across");
    		gridComponent.setCurrentPos(0, 0);
    		$$invalidate(2, title = "");
    		$$invalidate(3, author = "");
    		$$invalidate(4, editor = "");
    		$$invalidate(5, date = "");
    		$$invalidate(0, grid = Array(size).fill(Array(size).fill("")));
    		questionsAcross.set([]);
    		clearState();
    		questionsDown.set([]);
    		$$invalidate(6, xd = XDEncode(getState()));
    	}

    	let fileInput;

    	function handleFileSelect() {
    		const reader = new FileReader();

    		reader.onload = (function () {
    			return function (e) {
    				try {
    					const xd_data = e.target.result;
    					const data = xdCrosswordParser(xd_data);

    					// console.log(data);
    					$$invalidate(0, grid = data.grid);

    					$$invalidate(7, size = data.grid.length);
    					gridComponent.setDir("across");
    					gridComponent.setCurrentPos(0, 0);
    					let questions_across = $questionsAcross;

    					for (let question of questions_across) {
    						let matching_question = data.across.find(q => q.num === `A${question.num}`);

    						// console.log(matching_question);
    						if (matching_question) {
    							question.question = matching_question.question;
    						}
    					}

    					questionsAcross.set(questions_across);
    					let questions_down = $questionsDown;

    					for (let question of questions_down) {
    						let matching_question = data.down.find(q => q.num === `D${question.num}`);

    						// console.log(matching_question);
    						if (matching_question) {
    							question.question = matching_question.question;
    						}
    					}

    					questionsDown.set(questions_down);
    					handleStateChange();
    				} catch(err) {
    					console.error(err);
    					throw "Unable to parse file";
    				}
    			};
    		})(fileInput.files[0]);

    		// Read in the image file as a data URL.
    		reader.readAsText(fileInput.files[0]);
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			fileInput = $$value;
    			$$invalidate(8, fileInput);
    		});
    	}

    	function input1_input_handler() {
    		title = this.value;
    		$$invalidate(2, title);
    	}

    	function input2_input_handler() {
    		author = this.value;
    		$$invalidate(3, author);
    	}

    	function input3_input_handler() {
    		editor = this.value;
    		$$invalidate(4, editor);
    	}

    	function input4_input_handler() {
    		date = this.value;
    		$$invalidate(5, date);
    	}

    	function input5_input_handler() {
    		size = to_number(this.value);
    		$$invalidate(7, size);
    	}

    	function grid_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			gridComponent = $$value;
    			$$invalidate(1, gridComponent);
    		});
    	}

    	function textarea_input_handler() {
    		xd = this.value;
    		$$invalidate(6, xd);
    	}

    	$$self.$$set = $$props => {
    		if ('grid' in $$props) $$invalidate(0, grid = $$props.grid);
    	};

    	return [
    		grid,
    		gridComponent,
    		title,
    		author,
    		editor,
    		date,
    		xd,
    		size,
    		fileInput,
    		handleMove,
    		handleLetter,
    		handleEnter,
    		handleBackspace,
    		handleStateChange,
    		handleReset,
    		handleFileSelect,
    		input0_binding,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		grid_1_binding,
    		textarea_input_handler
    	];
    }

    class JXWordCreator extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { grid: 0 });
    	}
    }

    function dist (target, props) {
        return new JXWordCreator({
            target,
            props
        });
    }

    return dist;

})();
