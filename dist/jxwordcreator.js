
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
function select_option(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
    select.selectedIndex = -1; // no option should be selected
}
function select_value(select) {
    const selected_option = select.querySelector(':checked') || select.options[0];
    return selected_option && selected_option.__value;
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
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
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

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
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
const currentDirection = writable("across");
const currentQuestion = writable({});

/* src/Menu.svelte generated by Svelte v3.46.4 */

function create_fragment$7(ctx) {
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
	let a0;
	let t5;
	let li1;
	let t6;
	let a1;
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
			a0 = element("a");
			a0.innerHTML = `<li class="svelte-1hgibzg">Instructions</li>`;
			t5 = space();
			li1 = element("li");
			li1.innerHTML = `<hr/>`;
			t6 = space();
			a1 = element("a");
			a1.innerHTML = `<li class="svelte-1hgibzg">Reset</li>`;
			attr(input, "type", "checkbox");
			attr(input, "class", "svelte-1hgibzg");
			attr(span0, "class", "jxword-hamberder svelte-1hgibzg");
			attr(span1, "class", "jxword-hamberder svelte-1hgibzg");
			attr(span2, "class", "jxword-hamberder svelte-1hgibzg");
			attr(a0, "href", "instructions");
			attr(a0, "class", "jxword-button svelte-1hgibzg");
			attr(li1, "class", "jxword-menu-break svelte-1hgibzg");
			attr(a1, "href", "#");
			attr(a1, "class", "jxword-button svelte-1hgibzg");
			attr(ul, "class", "jxword-menu svelte-1hgibzg");
			attr(div, "class", "jxword-menu-toggle svelte-1hgibzg");
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
			append(ul, a0);
			append(ul, t5);
			append(ul, li1);
			append(ul, t6);
			append(ul, a1);

			if (!mounted) {
				dispose = [
					listen(input, "change", /*input_change_handler*/ ctx[3]),
					listen(a0, "click", /*handleInstructions*/ ctx[2]),
					listen(a1, "click", /*handleReset*/ ctx[1])
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

function instance$7($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let showMenu = false;

	function handleReset(e) {
		e.preventDefault();
		dispatch('reset');
		$$invalidate(0, showMenu = false);
	}

	function handleInstructions(e) {
		e.preventDefault();
		dispatch('instructions');
		$$invalidate(0, showMenu = false);
	}

	function input_change_handler() {
		showMenu = this.checked;
		$$invalidate(0, showMenu);
	}

	return [showMenu, handleReset, handleInstructions, input_change_handler];
}

class Menu extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});
	}
}

var words = ["the","of","and","to","a","in","for","is","on","that","by","this","with","i","you","it","not","or","be","are","from","at","as","your","all","have","new","more","an","was","we","will","home","can","us","about","if","page","my","has","search","free","but","our","one","other","do","no","information","time","they","site","he","up","may","what","which","their","news","out","use","any","there","see","only","so","his","when","contact","here","business","who","web","also","now","help","get","pm","view","online","c","e","first","am","been","would","how","were","me","s","services","some","these","click","its","like","service","x","than","find","price","date","back","top","people","had","list","name","just","over","state","year","day","into","email","two","health","n","world","re","next","used","go","b","work","last","most","products","music","buy","data","make","them","should","product","system","post","her","city","t","add","policy","number","such","please","available","copyright","support","message","after","best","software","then","jan","good","video","well","d","where","info","rights","public","books","high","school","through","m","each","links","she","review","years","order","very","privacy","book","items","company","r","read","group","need","many","user","said","de","does","set","under","general","research","university","january","mail","full","map","reviews","program","life","know","games","way","days","management","p","part","could","great","united","hotel","real","f","item","international","center","ebay","must","store","travel","comments","made","development","report","off","member","details","line","terms","before","hotels","did","send","right","type","because","local","those","using","results","office","education","national","car","design","take","posted","internet","address","community","within","states","area","want","phone","dvd","shipping","reserved","subject","between","forum","family","l","long","based","w","code","show","o","even","black","check","special","prices","website","index","being","women","much","sign","file","link","open","today","technology","south","case","project","same","pages","uk","version","section","own","found","sports","house","related","security","both","g","county","american","photo","game","members","power","while","care","network","down","computer","systems","three","total","place","end","following","download","h","him","without","per","access","think","north","resources","current","posts","big","media","law","control","water","history","pictures","size","art","personal","since","including","guide","shop","directory","board","location","change","white","text","small","rating","rate","government","children","during","usa","return","students","v","shopping","account","times","sites","level","digital","profile","previous","form","events","love","old","john","main","call","hours","image","department","title","description","non","k","y","insurance","another","why","shall","property","class","cd","still","money","quality","every","listing","content","country","private","little","visit","save","tools","low","reply","customer","december","compare","movies","include","college","value","article","york","man","card","jobs","provide","j","food","source","author","different","press","u","learn","sale","around","print","course","job","canada","process","teen","room","stock","training","too","credit","point","join","science","men","categories","advanced","west","sales","look","english","left","team","estate","box","conditions","select","windows","photos","gay","thread","week","category","note","live","large","gallery","table","register","however","june","october","november","market","library","really","action","start","series","model","features","air","industry","plan","human","provided","tv","yes","required","second","hot","accessories","cost","movie","forums","march","la","september","better","say","questions","july","yahoo","going","medical","test","friend","come","dec","server","pc","study","application","cart","staff","articles","san","feedback","again","play","looking","issues","april","never","users","complete","street","topic","comment","financial","things","working","against","standard","tax","person","below","mobile","less","got","blog","party","payment","equipment","login","student","let","programs","offers","legal","above","recent","park","stores","side","act","problem","red","give","memory","performance","social","q","august","quote","language","story","sell","options","experience","rates","create","key","body","young","america","important","field","few","east","paper","single","ii","age","activities","club","example","girls","additional","password","z","latest","something","road","gift","question","changes","night","ca","hard","texas","oct","pay","four","poker","status","browse","issue","range","building","seller","court","february","always","result","audio","light","write","war","nov","offer","blue","groups","al","easy","given","files","event","release","analysis","request","fax","china","making","picture","needs","possible","might","professional","yet","month","major","star","areas","future","space","committee","hand","sun","cards","problems","london","washington","meeting","rss","become","interest","id","child","keep","enter","california","share","similar","garden","schools","million","added","reference","companies","listed","baby","learning","energy","run","delivery","net","popular","term","film","stories","put","computers","journal","reports","co","try","welcome","central","images","president","notice","original","head","radio","until","cell","color","self","council","away","includes","track","australia","discussion","archive","once","others","entertainment","agreement","format","least","society","months","log","safety","friends","sure","faq","trade","edition","cars","messages","marketing","tell","further","updated","association","able","having","provides","david","fun","already","green","studies","close","common","drive","specific","several","gold","feb","living","sep","collection","called","short","arts","lot","ask","display","limited","powered","solutions","means","director","daily","beach","past","natural","whether","due","et","electronics","five","upon","period","planning","database","says","official","weather","mar","land","average","done","technical","window","france","pro","region","island","record","direct","microsoft","conference","environment","records","st","district","calendar","costs","style","url","front","statement","update","parts","aug","ever","downloads","early","miles","sound","resource","present","applications","either","ago","document","word","works","material","bill","apr","written","talk","federal","hosting","rules","final","adult","tickets","thing","centre","requirements","via","cheap","kids","finance","true","minutes","else","mark","third","rock","gifts","europe","reading","topics","bad","individual","tips","plus","auto","cover","usually","edit","together","videos","percent","fast","function","fact","unit","getting","global","tech","meet","far","economic","en","player","projects","lyrics","often","subscribe","submit","germany","amount","watch","included","feel","though","bank","risk","thanks","everything","deals","various","words","linux","jul","production","commercial","james","weight","town","heart","advertising","received","choose","treatment","newsletter","archives","points","knowledge","magazine","error","camera","jun","girl","currently","construction","toys","registered","clear","golf","receive","domain","methods","chapter","makes","protection","policies","loan","wide","beauty","manager","india","position","taken","sort","listings","models","michael","known","half","cases","step","engineering","florida","simple","quick","none","wireless","license","paul","friday","lake","whole","annual","published","later","basic","sony","shows","corporate","google","church","method","purchase","customers","active","response","practice","hardware","figure","materials","fire","holiday","chat","enough","designed","along","among","death","writing","speed","html","countries","loss","face","brand","discount","higher","effects","created","remember","standards","oil","bit","yellow","political","increase","advertise","kingdom","base","near","environmental","thought","stuff","french","storage","oh","japan","doing","loans","shoes","entry","stay","nature","orders","availability","africa","summary","turn","mean","growth","notes","agency","king","monday","european","activity","copy","although","drug","pics","western","income","force","cash","employment","overall","bay","river","commission","ad","package","contents","seen","players","engine","port","album","regional","stop","supplies","started","administration","bar","institute","views","plans","double","dog","build","screen","exchange","types","soon","sponsored","lines","electronic","continue","across","benefits","needed","season","apply","someone","held","ny","anything","printer","condition","effective","believe","organization","effect","asked","eur","mind","sunday","selection","casino","pdf","lost","tour","menu","volume","cross","anyone","mortgage","hope","silver","corporation","wish","inside","solution","mature","role","rather","weeks","addition","came","supply","nothing","certain","usr","executive","running","lower","necessary","union","jewelry","according","dc","clothing","mon","com","particular","fine","names","robert","homepage","hour","gas","skills","six","bush","islands","advice","career","military","rental","decision","leave","british","teens","pre","huge","sat","woman","facilities","zip","bid","kind","sellers","middle","move","cable","opportunities","taking","values","division","coming","tuesday","object","lesbian","appropriate","machine","logo","length","actually","nice","score","statistics","client","ok","returns","capital","follow","sample","investment","sent","shown","saturday","christmas","england","culture","band","flash","ms","lead","george","choice","went","starting","registration","fri","thursday","courses","consumer","hi","airport","foreign","artist","outside","furniture","levels","channel","letter","mode","phones","ideas","wednesday","structure","fund","summer","allow","degree","contract","button","releases","wed","homes","super","male","matter","custom","virginia","almost","took","located","multiple","asian","distribution","editor","inn","industrial","cause","potential","song","cnet","ltd","los","hp","focus","late","fall","featured","idea","rooms","female","responsible","inc","communications","win","associated","thomas","primary","cancer","numbers","reason","tool","browser","spring","foundation","answer","voice","eg","friendly","schedule","documents","communication","purpose","feature","bed","comes","police","everyone","independent","ip","approach","cameras","brown","physical","operating","hill","maps","medicine","deal","hold","ratings","chicago","forms","glass","happy","tue","smith","wanted","developed","thank","safe","unique","survey","prior","telephone","sport","ready","feed","animal","sources","mexico","population","pa","regular","secure","navigation","operations","therefore","simply","evidence","station","christian","round","paypal","favorite","understand","option","master","valley","recently","probably","thu","rentals","sea","built","publications","blood","cut","worldwide","improve","connection","publisher","hall","larger","anti","networks","earth","parents","nokia","impact","transfer","introduction","kitchen","strong","tel","carolina","wedding","properties","hospital","ground","overview","ship","accommodation","owners","disease","tx","excellent","paid","italy","perfect","hair","opportunity","kit","classic","basis","command","cities","william","express","award","distance","tree","peter","assessment","ensure","thus","wall","ie","involved","el","extra","especially","interface","partners","budget","rated","guides","success","maximum","ma","operation","existing","quite","selected","boy","amazon","patients","restaurants","beautiful","warning","wine","locations","horse","vote","forward","flowers","stars","significant","lists","technologies","owner","retail","animals","useful","directly","manufacturer","ways","est","son","providing","rule","mac","housing","takes","iii","gmt","bring","catalog","searches","max","trying","mother","authority","considered","told","xml","traffic","programme","joined","input","strategy","feet","agent","valid","bin","modern","senior","ireland","teaching","door","grand","testing","trial","charge","units","instead","canadian","cool","normal","wrote","enterprise","ships","entire","educational","md","leading","metal","positive","fl","fitness","chinese","opinion","mb","asia","football","abstract","uses","output","funds","mr","greater","likely","develop","employees","artists","alternative","processing","responsibility","resolution","java","guest","seems","publication","pass","relations","trust","van","contains","session","multi","photography","republic","fees","components","vacation","century","academic","assistance","completed","skin","graphics","indian","prev","ads","mary","il","expected","ring","grade","dating","pacific","mountain","organizations","pop","filter","mailing","vehicle","longer","consider","int","northern","behind","panel","floor","german","buying","match","proposed","default","require","iraq","boys","outdoor","deep","morning","otherwise","allows","rest","protein","plant","reported","hit","transportation","mm","pool","mini","politics","partner","disclaimer","authors","boards","faculty","parties","fish","membership","mission","eye","string","sense","modified","pack","released","stage","internal","goods","recommended","born","unless","richard","detailed","japanese","race","approved","background","target","except","character","usb","maintenance","ability","maybe","functions","ed","moving","brands","places","php","pretty","trademarks","phentermine","spain","southern","yourself","etc","winter","battery","youth","pressure","submitted","boston","debt","keywords","medium","television","interested","core","break","purposes","throughout","sets","dance","wood","msn","itself","defined","papers","playing","awards","fee","studio","reader","virtual","device","established","answers","rent","las","remote","dark","programming","external","apple","le","regarding","instructions","min","offered","theory","enjoy","remove","aid","surface","minimum","visual","host","variety","teachers","isbn","martin","manual","block","subjects","agents","increased","repair","fair","civil","steel","understanding","songs","fixed","wrong","beginning","hands","associates","finally","az","updates","desktop","classes","paris","ohio","gets","sector","capacity","requires","jersey","un","fat","fully","father","electric","saw","instruments","quotes","officer","driver","businesses","dead","respect","unknown","specified","restaurant","mike","trip","pst","worth","mi","procedures","poor","teacher","eyes","relationship","workers","farm","georgia","peace","traditional","campus","tom","showing","creative","coast","benefit","progress","funding","devices","lord","grant","sub","agree","fiction","hear","sometimes","watches","careers","beyond","goes","families","led","museum","themselves","fan","transport","interesting","blogs","wife","evaluation","accepted","former","implementation","ten","hits","zone","complex","th","cat","galleries","references","die","presented","jack","flat","flow","agencies","literature","respective","parent","spanish","michigan","columbia","setting","dr","scale","stand","economy","highest","helpful","monthly","critical","frame","musical","definition","secretary","angeles","networking","path","australian","employee","chief","gives","kb","bottom","magazines","packages","detail","francisco","laws","changed","pet","heard","begin","individuals","colorado","royal","clean","switch","russian","largest","african","guy","titles","relevant","guidelines","justice","connect","bible","dev","cup","basket","applied","weekly","vol","installation","described","demand","pp","suite","vegas","na","square","chris","attention","advance","skip","diet","army","auction","gear","lee","os","difference","allowed","correct","charles","nation","selling","lots","piece","sheet","firm","seven","older","illinois","regulations","elements","species","jump","cells","module","resort","facility","random","pricing","dvds","certificate","minister","motion","looks","fashion","directions","visitors","documentation","monitor","trading","forest","calls","whose","coverage","couple","giving","chance","vision","ball","ending","clients","actions","listen","discuss","accept","automotive","naked","goal","successful","sold","wind","communities","clinical","situation","sciences","markets","lowest","highly","publishing","appear","emergency","developing","lives","currency","leather","determine","temperature","palm","announcements","patient","actual","historical","stone","bob","commerce","ringtones","perhaps","persons","difficult","scientific","satellite","fit","tests","village","accounts","amateur","ex","met","pain","xbox","particularly","factors","coffee","www","settings","buyer","cultural","steve","easily","oral","ford","poster","edge","functional","root","au","fi","closed","holidays","ice","pink","zealand","balance","monitoring","graduate","replies","shot","nc","architecture","initial","label","thinking","scott","llc","sec","recommend","canon","league","waste","minute","bus","provider","optional","dictionary","cold","accounting","manufacturing","sections","chair","fishing","effort","phase","fields","bag","fantasy","po","letters","motor","va","professor","context","install","shirt","apparel","generally","continued","foot","mass","crime","count","breast","techniques","ibm","rd","johnson","sc","quickly","dollars","websites","religion","claim","driving","permission","surgery","patch","heat","wild","measures","generation","kansas","miss","chemical","doctor","task","reduce","brought","himself","nor","component","enable","exercise","bug","santa","mid","guarantee","leader","diamond","israel","se","processes","soft","servers","alone","meetings","seconds","jones","arizona","keyword","interests","flight","congress","fuel","username","walk","produced","italian","paperback","classifieds","wait","supported","pocket","saint","rose","freedom","argument","competition","creating","jim","drugs","joint","premium","providers","fresh","characters","attorney","upgrade","di","factor","growing","thousands","km","stream","apartments","pick","hearing","eastern","auctions","therapy","entries","dates","generated","signed","upper","administrative","serious","prime","samsung","limit","began","louis","steps","errors","shops","del","efforts","informed","ga","ac","thoughts","creek","ft","worked","quantity","urban","practices","sorted","reporting","essential","myself","tours","platform","load","affiliate","labor","immediately","admin","nursing","defense","machines","designated","tags","heavy","covered","recovery","joe","guys","integrated","configuration","merchant","comprehensive","expert","universal","protect","drop","solid","cds","presentation","languages","became","orange","compliance","vehicles","prevent","theme","rich","im","campaign","marine","improvement","vs","guitar","finding","pennsylvania","examples","ipod","saying","spirit","ar","claims","challenge","motorola","acceptance","strategies","mo","seem","affairs","touch","intended","towards","sa","goals","hire","election","suggest","branch","charges","serve","affiliates","reasons","magic","mount","smart","talking","gave","ones","latin","multimedia","xp","avoid","certified","manage","corner","rank","computing","oregon","element","birth","virus","abuse","interactive","requests","separate","quarter","procedure","leadership","tables","define","racing","religious","facts","breakfast","kong","column","plants","faith","chain","developer","identify","avenue","missing","died","approximately","domestic","sitemap","recommendations","moved","houston","reach","comparison","mental","viewed","moment","extended","sequence","inch","attack","sorry","centers","opening","damage","lab","reserve","recipes","cvs","gamma","plastic","produce","snow","placed","truth","counter","failure","follows","eu","weekend","dollar","camp","ontario","automatically","des","minnesota","films","bridge","native","fill","williams","movement","printing","baseball","owned","approval","draft","chart","played","contacts","cc","jesus","readers","clubs","lcd","wa","jackson","equal","adventure","matching","offering","shirts","profit","leaders","posters","institutions","assistant","variable","ave","dj","advertisement","expect","parking","headlines","yesterday","compared","determined","wholesale","workshop","russia","gone","codes","kinds","extension","seattle","statements","golden","completely","teams","fort","cm","wi","lighting","senate","forces","funny","brother","gene","turned","portable","tried","electrical","applicable","disc","returned","pattern","ct","boat","named","theatre","laser","earlier","manufacturers","sponsor","classical","icon","warranty","dedicated","indiana","direction","harry","basketball","objects","ends","delete","evening","assembly","nuclear","taxes","mouse","signal","criminal","issued","brain","sexual","wisconsin","powerful","dream","obtained","false","da","cast","flower","felt","personnel","passed","supplied","identified","falls","pic","soul","aids","opinions","promote","stated","stats","hawaii","professionals","appears","carry","flag","decided","nj","covers","hr","em","advantage","hello","designs","maintain","tourism","priority","newsletters","adults","clips","savings","iv","graphic","atom","payments","rw","estimated","binding","brief","ended","winning","eight","anonymous","iron","straight","script","served","wants","miscellaneous","prepared","void","dining","alert","integration","atlanta","dakota","tag","interview","mix","framework","disk","installed","queen","vhs","credits","clearly","fix","handle","sweet","desk","criteria","pubmed","dave","massachusetts","diego","hong","vice","associate","ne","truck","behavior","enlarge","ray","frequently","revenue","measure","changing","votes","du","duty","looked","discussions","bear","gain","festival","laboratory","ocean","flights","experts","signs","lack","depth","iowa","whatever","logged","laptop","vintage","train","exactly","dry","explore","maryland","spa","concept","nearly","eligible","checkout","reality","forgot","handling","origin","knew","gaming","feeds","billion","destination","scotland","faster","intelligence","dallas","bought","con","ups","nations","route","followed","specifications","broken","tripadvisor","frank","alaska","zoom","blow","battle","residential","anime","speak","decisions","industries","protocol","query","clip","partnership","editorial","nt","expression","es","equity","provisions","speech","wire","principles","suggestions","rural","shared","sounds","replacement","tape","strategic","judge","spam","economics","acid","bytes","cent","forced","compatible","fight","apartment","height","null","zero","speaker","filed","gb","netherlands","obtain","bc","consulting","recreation","offices","designer","remain","managed","pr","failed","marriage","roll","korea","banks","fr","participants","secret","bath","aa","kelly","leads","negative","austin","favorites","toronto","theater","springs","missouri","andrew","var","perform","healthy","translation","estimates","font","assets","injury","mt","joseph","ministry","drivers","lawyer","figures","married","protected","proposal","sharing","philadelphia","portal","waiting","birthday","beta","fail","gratis","banking","officials","brian","toward","won","slightly","assist","conduct","contained","lingerie","legislation","calling","parameters","jazz","serving","bags","profiles","miami","comics","matters","houses","doc","postal","relationships","tennessee","wear","controls","breaking","combined","ultimate","wales","representative","frequency","introduced","minor","finish","departments","residents","noted","displayed","mom","reduced","physics","rare","spent","performed","extreme","samples","davis","daniel","bars","reviewed","row","oz","forecast","removed","helps","singles","administrator","cycle","amounts","contain","accuracy","dual","rise","usd","sleep","mg","bird","pharmacy","brazil","creation","static","scene","hunter","addresses","lady","crystal","famous","writer","chairman","violence","fans","oklahoma","speakers","drink","academy","dynamic","gender","eat","permanent","agriculture","dell","cleaning","constitutes","portfolio","practical","delivered","collectibles","infrastructure","exclusive","seat","concerns","colour","vendor","originally","intel","utilities","philosophy","regulation","officers","reduction","aim","bids","referred","supports","nutrition","recording","regions","junior","toll","les","cape","ann","rings","meaning","tip","secondary","wonderful","mine","ladies","henry","ticket","announced","guess","agreed","prevention","whom","ski","soccer","math","import","posting","presence","instant","mentioned","automatic","healthcare","viewing","maintained","ch","increasing","majority","connected","christ","dan","dogs","sd","directors","aspects","austria","ahead","moon","participation","scheme","utility","preview","fly","manner","matrix","containing","combination","devel","amendment","despite","strength","guaranteed","turkey","libraries","proper","distributed","degrees","singapore","enterprises","delta","fear","seeking","inches","phoenix","rs","convention","shares","principal","daughter","standing","comfort","colors","wars","cisco","ordering","kept","alpha","appeal","cruise","bonus","certification","previously","hey","bookmark","buildings","specials","beat","disney","household","batteries","adobe","smoking","bbc","becomes","drives","arms","alabama","tea","improved","trees","avg","achieve","positions","dress","subscription","dealer","contemporary","sky","utah","nearby","rom","carried","happen","exposure","panasonic","hide","permalink","signature","gambling","refer","miller","provision","outdoors","clothes","caused","luxury","babes","frames","certainly","indeed","newspaper","toy","circuit","layer","printed","slow","removal","easier","src","liability","trademark","hip","printers","faqs","nine","adding","kentucky","mostly","eric","spot","taylor","trackback","prints","spend","factory","interior","revised","grow","americans","optical","promotion","relative","amazing","clock","dot","hiv","identity","suites","conversion","feeling","hidden","reasonable","victoria","serial","relief","revision","broadband","influence","ratio","pda","importance","rain","onto","dsl","planet","webmaster","copies","recipe","zum","permit","seeing","proof","dna","diff","tennis","bass","prescription","bedroom","empty","instance","hole","pets","ride","licensed","orlando","specifically","tim","bureau","maine","sql","represent","conservation","pair","ideal","specs","recorded","don","pieces","finished","parks","dinner","lawyers","sydney","stress","cream","ss","runs","trends","yeah","discover","ap","patterns","boxes","louisiana","hills","javascript","fourth","nm","advisor","mn","marketplace","nd","evil","aware","wilson","shape","evolution","irish","certificates","objectives","stations","suggested","gps","op","remains","acc","greatest","firms","concerned","euro","operator","structures","generic","encyclopedia","usage","cap","ink","charts","continuing","mixed","census","interracial","peak","tn","competitive","exist","wheel","transit","suppliers","salt","compact","poetry","lights","tracking","angel","bell","keeping","preparation","attempt","receiving","matches","accordance","width","noise","engines","forget","array","discussed","accurate","stephen","elizabeth","climate","reservations","pin","playstation","alcohol","greek","instruction","managing","annotation","sister","raw","differences","walking","explain","smaller","newest","establish","gnu","happened","expressed","jeff","extent","sharp","lesbians","ben","lane","paragraph","kill","mathematics","aol","compensation","ce","export","managers","aircraft","modules","sweden","conflict","conducted","versions","employer","occur","percentage","knows","mississippi","describe","concern","backup","requested","citizens","connecticut","heritage","personals","immediate","holding","trouble","spread","coach","kevin","agricultural","expand","supporting","audience","assigned","jordan","collections","ages","participate","plug","specialist","cook","affect","virgin","experienced","investigation","raised","hat","institution","directed","dealers","searching","sporting","helping","perl","affected","lib","bike","totally","plate","expenses","indicate","blonde","ab","proceedings","favourite","transmission","anderson","utc","characteristics","der","lose","organic","seek","experiences","albums","cheats","extremely","verzeichnis","contracts","guests","hosted","diseases","concerning","developers","equivalent","chemistry","tony","neighborhood","nevada","kits","thailand","variables","agenda","anyway","continues","tracks","advisory","cam","curriculum","logic","template","prince","circle","soil","grants","anywhere","psychology","responses","atlantic","wet","circumstances","edward","investor","identification","ram","leaving","wildlife","appliances","matt","elementary","cooking","speaking","sponsors","fox","unlimited","respond","sizes","plain","exit","entered","iran","arm","keys","launch","wave","checking","costa","belgium","printable","holy","acts","guidance","mesh","trail","enforcement","symbol","crafts","highway","buddy","hardcover","observed","dean","setup","poll","booking","glossary","fiscal","celebrity","styles","denver","unix","filled","bond","channels","ericsson","appendix","notify","blues","chocolate","pub","portion","scope","hampshire","supplier","cables","cotton","bluetooth","controlled","requirement","authorities","biology","dental","killed","border","ancient","debate","representatives","starts","pregnancy","causes","arkansas","biography","leisure","attractions","learned","transactions","notebook","explorer","historic","attached","opened","tm","husband","disabled","authorized","crazy","upcoming","britain","concert","retirement","scores","financing","efficiency","sp","comedy","adopted","efficient","weblog","linear","commitment","specialty","bears","jean","hop","carrier","edited","constant","visa","mouth","jewish","meter","linked","portland","interviews","concepts","nh","gun","reflect","pure","deliver","wonder","lessons","fruit","begins","qualified","reform","lens","alerts","treated","discovery","draw","mysql","classified","relating","assume","confidence","alliance","fm","confirm","warm","neither","lewis","howard","offline","leaves","engineer","lifestyle","consistent","replace","clearance","connections","inventory","converter","organisation","babe","checks","reached","becoming","safari","objective","indicated","sugar","crew","legs","sam","stick","securities","allen","pdt","relation","enabled","genre","slide","montana","volunteer","tested","rear","democratic","enhance","switzerland","exact","bound","parameter","adapter","processor","node","formal","dimensions","contribute","lock","hockey","storm","micro","colleges","laptops","mile","showed","challenges","editors","mens","threads","bowl","supreme","brothers","recognition","presents","ref","tank","submission","dolls","estimate","encourage","navy","kid","regulatory","inspection","consumers","cancel","limits","territory","transaction","manchester","weapons","paint","delay","pilot","outlet","contributions","continuous","db","czech","resulting","cambridge","initiative","novel","pan","execution","disability","increases","ultra","winner","idaho","contractor","ph","episode","examination","potter","dish","plays","bulletin","ia","pt","indicates","modify","oxford","adam","truly","epinions","painting","committed","extensive","affordable","universe","candidate","databases","patent","slot","psp","outstanding","ha","eating","perspective","planned","watching","lodge","messenger","mirror","tournament","consideration","ds","discounts","sterling","sessions","kernel","stocks","buyers","journals","gray","catalogue","ea","jennifer","antonio","charged","broad","taiwan","und","chosen","demo","greece","lg","swiss","sarah","clark","labour","hate","terminal","publishers","nights","behalf","caribbean","liquid","rice","nebraska","loop","salary","reservation","foods","gourmet","guard","properly","orleans","saving","nfl","remaining","empire","resume","twenty","newly","raise","prepare","avatar","gary","depending","illegal","expansion","vary","hundreds","rome","arab","lincoln","helped","premier","tomorrow","purchased","milk","decide","consent","drama","visiting","performing","downtown","keyboard","contest","collected","nw","bands","boot","suitable","ff","absolutely","millions","lunch","audit","push","chamber","guinea","findings","muscle","featuring","iso","implement","clicking","scheduled","polls","typical","tower","yours","sum","misc","calculator","significantly","chicken","temporary","attend","shower","alan","sending","jason","tonight","dear","sufficient","holdem","shell","province","catholic","oak","vat","awareness","vancouver","governor","beer","seemed","contribution","measurement","swimming","spyware","formula","constitution","packaging","solar","jose","catch","jane","pakistan","ps","reliable","consultation","northwest","sir","doubt","earn","finder","unable","periods","classroom","tasks","democracy","attacks","kim","wallpaper","merchandise","const","resistance","doors","symptoms","resorts","biggest","memorial","visitor","twin","forth","insert","baltimore","gateway","ky","dont","alumni","drawing","candidates","charlotte","ordered","biological","fighting","transition","happens","preferences","spy","romance","instrument","bruce","split","themes","powers","heaven","br","bits","pregnant","twice","classification","focused","egypt","physician","hollywood","bargain","wikipedia","cellular","norway","vermont","asking","blocks","normally","lo","spiritual","hunting","diabetes","suit","ml","shift","chip","res","sit","bodies","photographs","cutting","wow","simon","writers","marks","flexible","loved","favourites","mapping","numerous","relatively","birds","satisfaction","represents","char","indexed","pittsburgh","superior","preferred","saved","paying","cartoon","shots","intellectual","moore","granted","choices","carbon","spending","comfortable","magnetic","interaction","listening","effectively","registry","crisis","outlook","massive","denmark","employed","bright","treat","header","cs","poverty","formed","piano","echo","que","grid","sheets","patrick","experimental","puerto","revolution","consolidation","displays","plasma","allowing","earnings","voip","mystery","landscape","dependent","mechanical","journey","delaware","bidding","consultants","risks","banner","applicant","charter","fig","barbara","cooperation","counties","acquisition","ports","implemented","sf","directories","recognized","dreams","blogger","notification","kg","licensing","stands","teach","occurred","textbooks","rapid","pull","hairy","diversity","cleveland","ut","reverse","deposit","seminar","investments","latina","nasa","wheels","sexcam","specify","accessibility","dutch","sensitive","templates","formats","tab","depends","boots","holds","router","concrete","si","editing","poland","folder","womens","css","completion","upload","pulse","universities","technique","contractors","milfhunter","voting","courts","notices","subscriptions","calculate","mc","detroit","alexander","broadcast","converted","metro","toshiba","anniversary","improvements","strip","specification","pearl","accident","nick","accessible","accessory","resident","plot","qty","possibly","airline","typically","representation","regard","pump","exists","arrangements","smooth","conferences","uniprotkb","strike","consumption","birmingham","flashing","lp","narrow","afternoon","threat","surveys","sitting","putting","consultant","controller","ownership","committees","legislative","researchers","vietnam","trailer","anne","castle","gardens","missed","malaysia","unsubscribe","antique","labels","willing","bio","molecular","acting","heads","stored","exam","logos","residence","attorneys","milfs","antiques","density","hundred","ryan","operators","strange","sustainable","philippines","statistical","beds","mention","innovation","pcs","employers","grey","parallel","honda","amended","operate","bills","bold","bathroom","stable","opera","definitions","von","doctors","lesson","cinema","asset","ag","scan","elections","drinking","reaction","blank","enhanced","entitled","severe","generate","stainless","newspapers","hospitals","vi","deluxe","humor","aged","monitors","exception","lived","duration","bulk","successfully","indonesia","pursuant","sci","fabric","edt","visits","primarily","tight","domains","capabilities","pmid","contrast","recommendation","flying","recruitment","sin","berlin","cute","organized","ba","para","siemens","adoption","improving","cr","expensive","meant","capture","pounds","buffalo","organisations","plane","pg","explained","seed","programmes","desire","expertise","mechanism","camping","ee","jewellery","meets","welfare","peer","caught","eventually","marked","driven","measured","medline","bottle","agreements","considering","innovative","marshall","massage","rubber","conclusion","closing","tampa","thousand","meat","legend","grace","susan","ing","ks","adams","python","monster","alex","bang","villa","bone","columns","disorders","bugs","collaboration","hamilton","detection","ftp","cookies","inner","formation","tutorial","med","engineers","entity","cruises","gate","holder","proposals","moderator","sw","tutorials","settlement","portugal","lawrence","roman","duties","valuable","tone","collectables","ethics","forever","dragon","busy","captain","fantastic","imagine","brings","heating","leg","neck","hd","wing","governments","purchasing","scripts","abc","stereo","appointed","taste","dealing","commit","tiny","operational","rail","airlines","liberal","livecam","jay","trips","gap","sides","tube","turns","corresponding","descriptions","cache","belt","jacket","determination","animation","oracle","er","matthew","lease","productions","aviation","hobbies","proud","excess","disaster","console","commands","jr","telecommunications","instructor","giant","achieved","injuries","shipped","seats","approaches","biz","alarm","voltage","anthony","nintendo","usual","loading","stamps","appeared","franklin","angle","rob","vinyl","highlights","mining","designers","melbourne","ongoing","worst","imaging","betting","scientists","liberty","wyoming","blackjack","argentina","era","convert","possibility","analyst","commissioner","dangerous","garage","exciting","reliability","thongs","gcc","unfortunately","respectively","volunteers","attachment","ringtone","finland","morgan","derived","pleasure","honor","asp","oriented","eagle","desktops","pants","columbus","nurse","prayer","appointment","workshops","hurricane","quiet","luck","postage","producer","represented","mortgages","dial","responsibilities","cheese","comic","carefully","jet","productivity","investors","crown","par","underground","diagnosis","maker","crack","principle","picks","vacations","gang","semester","calculated","fetish","applies","casinos","appearance","smoke","apache","filters","incorporated","nv","craft","cake","notebooks","apart","fellow","blind","lounge","mad","algorithm","semi","coins","andy","gross","strongly","cafe","valentine","hilton","ken","proteins","horror","su","exp","familiar","capable","douglas","debian","till","involving","pen","investing","christopher","admission","epson","shoe","elected","carrying","victory","sand","madison","terrorism","joy","editions","cpu","mainly","ethnic","ran","parliament","actor","finds","seal","situations","fifth","allocated","citizen","vertical","corrections","structural","municipal","describes","prize","sr","occurs","jon","absolute","disabilities","consists","anytime","substance","prohibited","addressed","lies","pipe","soldiers","nr","guardian","lecture","simulation","layout","initiatives","ill","concentration","classics","lbs","lay","interpretation","horses","lol","dirty","deck","wayne","donate","taught","bankruptcy","mp","worker","optimization","alive","temple","substances","prove","discovered","wings","breaks","genetic","restrictions","participating","waters","promise","thin","exhibition","prefer","ridge","cabinet","modem","harris","mph","bringing","sick","dose","evaluate","tiffany","tropical","collect","bet","composition","toyota","streets","nationwide","vector","definitely","shaved","turning","buffer","purple","existence","commentary","larry","limousines","developments","def","immigration","destinations","lets","mutual","pipeline","necessarily","syntax","li","attribute","prison","skill","chairs","nl","everyday","apparently","surrounding","mountains","moves","popularity","inquiry","ethernet","checked","exhibit","throw","trend","sierra","visible","cats","desert","postposted","ya","oldest","rhode","nba","coordinator","obviously","mercury","steven","handbook","greg","navigate","worse","summit","victims","epa","spaces","fundamental","burning","escape","coupons","somewhat","receiver","substantial","tr","progressive","cialis","bb","boats","glance","scottish","championship","arcade","richmond","sacramento","impossible","ron","russell","tells","obvious","fiber","depression","graph","covering","platinum","judgment","bedrooms","talks","filing","foster","modeling","passing","awarded","testimonials","trials","tissue","nz","memorabilia","clinton","masters","bonds","cartridge","alberta","explanation","folk","org","commons","cincinnati","subsection","fraud","electricity","permitted","spectrum","arrival","okay","pottery","emphasis","roger","aspect","workplace","awesome","mexican","confirmed","counts","priced","wallpapers","hist","crash","lift","desired","inter","closer","assumes","heights","shadow","riding","infection","firefox","lisa","expense","grove","eligibility","venture","clinic","korean","healing","princess","mall","entering","packet","spray","studios","involvement","dad","buttons","placement","observations","vbulletin","funded","thompson","winners","extend","roads","subsequent","pat","dublin","rolling","fell","motorcycle","yard","disclosure","establishment","memories","nelson","te","arrived","creates","faces","tourist","av","mayor","murder","sean","adequate","senator","yield","presentations","grades","cartoons","pour","digest","reg","lodging","tion","dust","hence","wiki","entirely","replaced","radar","rescue","undergraduate","losses","combat","reducing","stopped","occupation","lakes","donations","associations","citysearch","closely","radiation","diary","seriously","kings","shooting","kent","adds","nsw","ear","flags","pci","baker","launched","elsewhere","pollution","conservative","guestbook","shock","effectiveness","walls","abroad","ebony","tie","ward","drawn","arthur","ian","visited","roof","walker","demonstrate","atmosphere","suggests","kiss","beast","ra","operated","experiment","targets","overseas","purchases","dodge","counsel","federation","pizza","invited","yards","assignment","chemicals","gordon","mod","farmers","rc","queries","bmw","rush","ukraine","absence","nearest","cluster","vendors","mpeg","whereas","yoga","serves","woods","surprise","lamp","rico","partial","shoppers","phil","everybody","couples","nashville","ranking","jokes","cst","http","ceo","simpson","twiki","sublime","counseling","palace","acceptable","satisfied","glad","wins","measurements","verify","globe","trusted","copper","milwaukee","rack","medication","warehouse","shareware","ec","rep","dicke","kerry","receipt","supposed","ordinary","nobody","ghost","violation","configure","stability","mit","applying","southwest","boss","pride","institutional","expectations","independence","knowing","reporter","metabolism","keith","champion","cloudy","linda","ross","personally","chile","anna","plenty","solo","sentence","throat","ignore","maria","uniform","excellence","wealth","tall","rm","somewhere","vacuum","dancing","attributes","recognize","brass","writes","plaza","pdas","outcomes","survival","quest","publish","sri","screening","toe","thumbnail","trans","jonathan","whenever","nova","lifetime","api","pioneer","booty","forgotten","acrobat","plates","acres","venue","athletic","thermal","essays","behaviour","vital","telling","fairly","coastal","config","cf","charity","intelligent","edinburgh","vt","excel","modes","obligation","campbell","wake","stupid","harbor","hungary","traveler","urw","segment","realize","regardless","lan","enemy","puzzle","rising","aluminum","wells","wishlist","opens","insight","sms","restricted","republican","secrets","lucky","latter","merchants","thick","trailers","repeat","syndrome","philips","attendance","penalty","drum","glasses","enables","nec","iraqi","builder","vista","jessica","chips","terry","flood","foto","ease","arguments","amsterdam","arena","adventures","pupils","stewart","announcement","tabs","outcome","appreciate","expanded","casual","grown","polish","lovely","extras","gm","centres","jerry","clause","smile","lands","ri","troops","indoor","bulgaria","armed","broker","charger","regularly","believed","pine","cooling","tend","gulf","rt","rick","trucks","cp","mechanisms","divorce","laura","shopper","tokyo","partly","nikon","customize","tradition","candy","pills","tiger","donald","folks","sensor","exposed","telecom","hunt","angels","deputy","indicators","sealed","thai","emissions","physicians","loaded","fred","complaint","scenes","experiments","afghanistan","dd","boost","spanking","scholarship","governance","mill","founded","supplements","chronic","icons","moral","den","catering","aud","finger","keeps","pound","locate","camcorder","pl","trained","burn","implementing","roses","labs","ourselves","bread","tobacco","wooden","motors","tough","roberts","incident","gonna","dynamics","lie","crm","rf","conversation","decrease","cumshots","chest","pension","billy","revenues","emerging","worship","capability","ak","fe","craig","herself","producing","churches","precision","damages","reserves","contributed","solve","shorts","reproduction","minority","td","diverse","amp","ingredients","sb","ah","johnny","sole","franchise","recorder","complaints","facing","sm","nancy","promotions","tones","passion","rehabilitation","maintaining","sight","laid","clay","defence","patches","weak","refund","usc","towns","environments","trembl","divided","blvd","reception","amd","wise","emails","cyprus","wv","odds","correctly","insider","seminars","consequences","makers","hearts","geography","appearing","integrity","worry","ns","discrimination","eve","carter","legacy","marc","pleased","danger","vitamin","widely","processed","phrase","genuine","raising","implications","functionality","paradise","hybrid","reads","roles","intermediate","emotional","sons","leaf","pad","glory","platforms","ja","bigger","billing","diesel","versus","combine","overnight","geographic","exceed","bs","rod","saudi","fault","cuba","hrs","preliminary","districts","introduce","silk","promotional","kate","chevrolet","babies","bi","karen","compiled","romantic","revealed","specialists","generator","albert","examine","jimmy","graham","suspension","bristol","margaret","compaq","sad","correction","wolf","slowly","authentication","communicate","rugby","supplement","showtimes","cal","portions","infant","promoting","sectors","samuel","fluid","grounds","fits","kick","regards","meal","ta","hurt","machinery","bandwidth","unlike","equation","baskets","probability","pot","dimension","wright","img","barry","proven","schedules","admissions","cached","warren","slip","studied","reviewer","involves","quarterly","rpm","profits","devil","grass","comply","marie","florist","illustrated","cherry","continental","alternate","deutsch","achievement","limitations","kenya","webcam","cuts","funeral","nutten","earrings","enjoyed","automated","chapters","pee","charlie","quebec","passenger","convenient","dennis","mars","francis","tvs","sized","manga","noticed","socket","silent","literary","egg","mhz","signals","caps","orientation","pill","theft","childhood","swing","symbols","lat","meta","humans","analog","facial","choosing","talent","dated","flexibility","seeker","wisdom","shoot","boundary","mint","packard","offset","payday","philip","elite","gi","spin","holders","believes","swedish","poems","deadline","jurisdiction","robot","displaying","witness","collins","equipped","stages","encouraged","sur","winds","powder","broadway","acquired","assess","wash","cartridges","stones","entrance","gnome","roots","declaration","losing","attempts","gadgets","noble","glasgow","automation","impacts","rev","gospel","advantages","shore","loves","induced","ll","knight","preparing","loose","aims","recipient","linking","extensions","appeals","cl","earned","illness","islamic","athletics","southeast","ieee","ho","alternatives","pending","parker","determining","lebanon","corp","personalized","kennedy","gt","sh","conditioning","teenage","soap","ae","triple","cooper","nyc","vincent","jam","secured","unusual","answered","partnerships","destruction","slots","increasingly","migration","disorder","routine","toolbar","basically","rocks","conventional","titans","applicants","wearing","axis","sought","genes","mounted","habitat","firewall","median","guns","scanner","herein","occupational","animated","judicial","rio","hs","adjustment","hero","integer","treatments","bachelor","attitude","camcorders","engaged","falling","basics","montreal","carpet","rv","struct","lenses","binary","genetics","attended","difficulty","punk","collective","coalition","pi","dropped","enrollment","duke","walter","ai","pace","besides","wage","producers","ot","collector","arc","hosts","interfaces","advertisers","moments","atlas","strings","dawn","representing","observation","feels","torture","carl","deleted","coat","mitchell","mrs","rica","restoration","convenience","returning","ralph","opposition","container","yr","defendant","warner","confirmation","app","embedded","inkjet","supervisor","wizard","corps","actors","liver","peripherals","liable","brochure","morris","bestsellers","petition","eminem","recall","antenna","picked","assumed","departure","minneapolis","belief","killing","bikini","memphis","shoulder","decor","lookup","texts","harvard","brokers","roy","ion","diameter","ottawa","doll","ic","podcast","seasons","peru","interactions","refine","bidder","singer","evans","herald","literacy","fails","aging","nike","intervention","fed","plugin","attraction","diving","invite","modification","alice","latinas","suppose","customized","reed","involve","moderate","terror","younger","thirty","mice","opposite","understood","rapidly","dealtime","ban","temp","intro","mercedes","zus","assurance","clerk","happening","vast","mills","outline","amendments","tramadol","holland","receives","jeans","metropolitan","compilation","verification","fonts","ent","odd","wrap","refers","mood","favor","veterans","quiz","mx","sigma","gr","attractive","xhtml","occasion","recordings","jefferson","victim","demands","sleeping","careful","ext","beam","gardening","obligations","arrive","orchestra","sunset","tracked","moreover","minimal","polyphonic","lottery","tops","framed","aside","outsourcing","licence","adjustable","allocation","michelle","essay","discipline","amy","ts","demonstrated","dialogue","identifying","alphabetical","camps","declared","dispatched","aaron","handheld","trace","disposal","shut","florists","packs","ge","installing","switches","romania","voluntary","ncaa","thou","consult","phd","greatly","blogging","mask","cycling","midnight","ng","commonly","pe","photographer","inform","turkish","coal","cry","messaging","pentium","quantum","murray","intent","tt","zoo","largely","pleasant","announce","constructed","additions","requiring","spoke","aka","arrow","engagement","sampling","rough","weird","tee","refinance","lion","inspired","holes","weddings","blade","suddenly","oxygen","cookie","meals","canyon","goto","meters","merely","calendars","arrangement","conclusions","passes","bibliography","pointer","compatibility","stretch","durham","furthermore","permits","cooperative","muslim","xl","neil","sleeve","netscape","cleaner","cricket","beef","feeding","stroke","township","rankings","measuring","cad","hats","robin","robinson","jacksonville","strap","headquarters","sharon","crowd","tcp","transfers","surf","olympic","transformation","remained","attachments","dv","dir","entities","customs","administrators","personality","rainbow","hook","roulette","decline","gloves","israeli","medicare","cord","skiing","cloud","facilitate","subscriber","valve","val","hewlett","explains","proceed","flickr","feelings","knife","jamaica","priorities","shelf","bookstore","timing","liked","parenting","adopt","denied","fotos","incredible","britney","freeware","donation","outer","crop","deaths","rivers","commonwealth","pharmaceutical","manhattan","tales","katrina","workforce","islam","nodes","tu","fy","thumbs","seeds","cited","lite","ghz","hub","targeted","organizational","skype","realized","twelve","founder","decade","gamecube","rr","dispute","portuguese","tired","titten","adverse","everywhere","excerpt","eng","steam","discharge","ef","drinks","ace","voices","acute","halloween","climbing","stood","sing","tons","perfume","carol","honest","albany","hazardous","restore","stack","methodology","somebody","sue","ep","housewares","reputation","resistant","democrats","recycling","hang","gbp","curve","creator","amber","qualifications","museums","coding","slideshow","tracker","variation","passage","transferred","trunk","hiking","lb","pierre","jelsoft","headset","photograph","oakland","colombia","waves","camel","distributor","lamps","underlying","hood","wrestling","suicide","archived","photoshop","jp","chi","bt","arabia","gathering","projection","juice","chase","mathematical","logical","sauce","fame","extract","specialized","diagnostic","panama","indianapolis","af","payable","corporations","courtesy","criticism","automobile","confidential","rfc","statutory","accommodations","athens","northeast","downloaded","judges","sl","seo","retired","isp","remarks","detected","decades","paintings","walked","arising","nissan","bracelet","ins","eggs","juvenile","injection","yorkshire","populations","protective","afraid","acoustic","railway","cassette","initially","indicator","pointed","hb","jpg","causing","mistake","norton","locked","eliminate","tc","fusion","mineral","sunglasses","ruby","steering","beads","fortune","preference","canvas","threshold","parish","claimed","screens","cemetery","planner","croatia","flows","stadium","venezuela","exploration","mins","fewer","sequences","coupon","nurses","ssl","stem","proxy","astronomy","lanka","opt","edwards","drew","contests","flu","translate","announces","mlb","costume","tagged","berkeley","voted","killer","bikes","gates","adjusted","rap","tune","bishop","pulled","corn","gp","shaped","compression","seasonal","establishing","farmer","counters","puts","constitutional","grew","perfectly","tin","slave","instantly","cultures","norfolk","coaching","examined","trek","encoding","litigation","submissions","oem","heroes","painted","lycos","ir","zdnet","broadcasting","horizontal","artwork","cosmetic","resulted","portrait","terrorist","informational","ethical","carriers","ecommerce","mobility","floral","builders","ties","struggle","schemes","suffering","neutral","fisher","rat","spears","prospective","bedding","ultimately","joining","heading","equally","artificial","bearing","spectacular","coordination","connector","brad","combo","seniors","worlds","guilty","affiliated","activation","naturally","haven","tablet","jury","dos","tail","subscribers","charm","lawn","violent","mitsubishi","underwear","basin","soup","potentially","ranch","constraints","crossing","inclusive","dimensional","cottage","drunk","considerable","crimes","resolved","mozilla","byte","toner","nose","latex","branches","anymore","oclc","delhi","holdings","alien","locator","selecting","processors","pantyhose","plc","broke","nepal","zimbabwe","difficulties","juan","complexity","msg","constantly","browsing","resolve","barcelona","presidential","documentary","cod","territories","melissa","moscow","thesis","thru","jews","nylon","palestinian","discs","rocky","bargains","frequent","trim","nigeria","ceiling","pixels","ensuring","hispanic","cv","cb","legislature","hospitality","gen","anybody","procurement","diamonds","espn","fleet","untitled","bunch","totals","marriott","singing","theoretical","afford","exercises","starring","referral","nhl","surveillance","optimal","quit","distinct","protocols","lung","highlight","substitute","inclusion","hopefully","brilliant","turner","sucking","cents","reuters","ti","fc","gel","todd","spoken","omega","evaluated","stayed","civic","assignments","fw","manuals","doug","sees","termination","watched","saver","thereof","grill","households","gs","redeem","rogers","grain","aaa","authentic","regime","wanna","wishes","bull","montgomery","architectural","louisville","depend","differ","macintosh","movements","ranging","monica","repairs","breath","amenities","virtually","cole","mart","candle","hanging","colored","authorization","tale","verified","lynn","formerly","projector","bp","situated","comparative","std","seeks","herbal","loving","strictly","routing","docs","stanley","psychological","surprised","retailer","vitamins","elegant","gains","renewal","vid","genealogy","opposed","deemed","scoring","expenditure","brooklyn","liverpool","sisters","critics","connectivity","spots","oo","algorithms","hacker","madrid","similarly","margin","coin","solely","fake","salon","collaborative","norman","fda","excluding","turbo","headed","voters","cure","madonna","commander","arch","ni","murphy","thinks","thats","suggestion","hdtv","soldier","phillips","asin","aimed","justin","bomb","harm","interval","mirrors","spotlight","tricks","reset","brush","investigate","thy","expansys","panels","repeated","assault","connecting","spare","logistics","deer","kodak","tongue","bowling","tri","danish","pal","monkey","proportion","filename","skirt","florence","invest","honey","um","analyses","drawings","significance","scenario","ye","fs","lovers","atomic","approx","symposium","arabic","gauge","essentials","junction","protecting","nn","faced","mat","rachel","solving","transmitted","weekends","screenshots","produces","oven","ted","intensive","chains","kingston","sixth","engage","deviant","noon","switching","quoted","adapters","correspondence","farms","imports","supervision","cheat","bronze","expenditures","sandy","separation","testimony","suspect","celebrities","macro","sender","mandatory","boundaries","crucial","syndication","gym","celebration","kde","adjacent","filtering","tuition","spouse","exotic","viewer","signup","threats","luxembourg","puzzles","reaching","vb","damaged","cams","receptor","laugh","joel","surgical","destroy","citation","pitch","autos","yo","premises","perry","proved","offensive","imperial","dozen","benjamin","deployment","teeth","cloth","studying","colleagues","stamp","lotus","salmon","olympus","separated","proc","cargo","tan","directive","fx","salem","mate","dl","starter","upgrades","likes","butter","pepper","weapon","luggage","burden","chef","tapes","zones","races","isle","stylish","slim","maple","luke","grocery","offshore","governing","retailers","depot","kenneth","comp","alt","pie","blend","harrison","ls","julie","occasionally","cbs","attending","emission","pete","spec","finest","realty","janet","bow","penn","recruiting","apparent","instructional","phpbb","autumn","traveling","probe","midi","permissions","biotechnology","toilet","ranked","jackets","routes","packed","excited","outreach","helen","mounting","recover","tied","lopez","balanced","prescribed","catherine","timely","talked","upskirts","debug","delayed","chuck","reproduced","hon","dale","explicit","calculation","villas","ebook","consolidated","exclude","peeing","occasions","brooks","equations","newton","oils","sept","exceptional","anxiety","bingo","whilst","spatial","respondents","unto","lt","ceramic","prompt","precious","minds","annually","considerations","scanners","atm","xanax","eq","pays","fingers","sunny","ebooks","delivers","je","queensland","necklace","musicians","leeds","composite","unavailable","cedar","arranged","lang","theaters","advocacy","raleigh","stud","fold","essentially","designing","threaded","uv","qualify","blair","hopes","assessments","cms","mason","diagram","burns","pumps","footwear","sg","vic","beijing","peoples","victor","mario","pos","attach","licenses","utils","removing","advised","brunswick","spider","phys","ranges","pairs","sensitivity","trails","preservation","hudson","isolated","calgary","interim","assisted","divine","streaming","approve","chose","compound","intensity","technological","syndicate","abortion","dialog","venues","blast","wellness","calcium","newport","antivirus","addressing","pole","discounted","indians","shield","harvest","membrane","prague","previews","bangladesh","constitute","locally","concluded","pickup","desperate","mothers","nascar","iceland","demonstration","governmental","manufactured","candles","graduation","mega","bend","sailing","variations","moms","sacred","addiction","morocco","chrome","tommy","springfield","refused","brake","exterior","greeting","ecology","oliver","congo","glen","botswana","nav","delays","synthesis","olive","undefined","unemployment","cyber","verizon","scored","enhancement","newcastle","clone","dicks","velocity","lambda","relay","composed","tears","performances","oasis","baseline","cab","angry","fa","societies","silicon","brazilian","identical","petroleum","compete","ist","norwegian","lover","belong","honolulu","beatles","lips","retention","exchanges","pond","rolls","thomson","barnes","soundtrack","wondering","malta","daddy","lc","ferry","rabbit","profession","seating","dam","cnn","separately","physiology","lil","collecting","das","exports","omaha","tire","participant","scholarships","recreational","dominican","chad","electron","loads","friendship","heather","passport","motel","unions","treasury","warrant","sys","solaris","frozen","occupied","josh","royalty","scales","rally","observer","sunshine","strain","drag","ceremony","somehow","arrested","expanding","provincial","investigations","icq","ripe","yamaha","rely","medications","hebrew","gained","rochester","dying","laundry","stuck","solomon","placing","stops","homework","adjust","assessed","advertiser","enabling","encryption","filling","downloadable","sophisticated","imposed","silence","scsi","focuses","soviet","possession","cu","laboratories","treaty","vocal","trainer","organ","stronger","volumes","advances","vegetables","lemon","toxic","dns","thumbnails","darkness","pty","ws","nuts","nail","bizrate","vienna","implied","span","stanford","sox","stockings","joke","respondent","packing","statute","rejected","satisfy","destroyed","shelter","chapel","gamespot","manufacture","layers","wordpress","guided","vulnerability","accountability","celebrate","accredited","appliance","compressed","bahamas","powell","mixture","bench","univ","tub","rider","scheduling","radius","perspectives","mortality","logging","hampton","christians","borders","therapeutic","pads","butts","inns","bobby","impressive","sheep","accordingly","architect","railroad","lectures","challenging","wines","nursery","harder","cups","ash","microwave","cheapest","accidents","travesti","relocation","stuart","contributors","salvador","ali","salad","np","monroe","tender","violations","foam","temperatures","paste","clouds","competitions","discretion","tft","tanzania","preserve","jvc","poem","unsigned","staying","cosmetics","easter","theories","repository","praise","jeremy","venice","jo","concentrations","vibrators","estonia","christianity","veteran","streams","landing","signing","executed","katie","negotiations","realistic","dt","cgi","showcase","integral","asks","relax","namibia","generating","christina","congressional","synopsis","hardly","prairie","reunion","composer","bean","sword","absent","photographic","sells","ecuador","hoping","accessed","spirits","modifications","coral","pixel","float","colin","bias","imported","paths","bubble","por","acquire","contrary","millennium","tribune","vessel","acids","focusing","viruses","cheaper","admitted","dairy","admit","mem","fancy","equality","samoa","gc","achieving","tap","stickers","fisheries","exceptions","reactions","leasing","lauren","beliefs","ci","macromedia","companion","squad","analyze","ashley","scroll","relate","divisions","swim","wages","additionally","suffer","forests","fellowship","nano","invalid","concerts","martial","males","victorian","retain","colours","execute","tunnel","genres","cambodia","patents","copyrights","yn","chaos","lithuania","mastercard","wheat","chronicles","obtaining","beaver","updating","distribute","readings","decorative","kijiji","confused","compiler","enlargement","eagles","bases","vii","accused","bee","campaigns","unity","loud","conjunction","bride","rats","defines","airports","instances","indigenous","begun","cfr","brunette","packets","anchor","socks","validation","parade","corruption","stat","trigger","incentives","cholesterol","gathered","essex","slovenia","notified","differential","beaches","folders","dramatic","surfaces","terrible","routers","cruz","pendant","dresses","baptist","scientist","starsmerchant","hiring","clocks","arthritis","bios","females","wallace","nevertheless","reflects","taxation","fever","pmc","cuisine","surely","practitioners","transcript","myspace","theorem","inflation","thee","nb","ruth","pray","stylus","compounds","pope","drums","contracting","arnold","structured","reasonably","jeep","chicks","bare","hung","cattle","mba","radical","graduates","rover","recommends","controlling","treasure","reload","distributors","flame","levitra","tanks","assuming","monetary","elderly","pit","arlington","mono","particles","floating","extraordinary","tile","indicating","bolivia","spell","hottest","stevens","coordinate","kuwait","exclusively","emily","alleged","limitation","widescreen","compile","squirting","webster","struck","rx","illustration","plymouth","warnings","construct","apps","inquiries","bridal","annex","mag","gsm","inspiration","tribal","curious","affecting","freight","rebate","meetup","eclipse","sudan","ddr","downloading","rec","shuttle","aggregate","stunning","cycles","affects","forecasts","detect","actively","ciao","ampland","knee","prep","pb","complicated","chem","fastest","butler","shopzilla","injured","decorating","payroll","cookbook","expressions","ton","courier","uploaded","shakespeare","hints","collapse","americas","connectors","twinks","unlikely","oe","gif","pros","conflicts","techno","beverage","tribute","wired","elvis","immune","latvia","travelers","forestry","barriers","cant","jd","rarely","gpl","infected","offerings","martha","genesis","barrier","argue","incorrect","trains","metals","bicycle","furnishings","letting","arise","guatemala","celtic","thereby","irc","jamie","particle","perception","minerals","advise","humidity","bottles","boxing","wy","dm","bangkok","renaissance","pathology","sara","bra","ordinance","hughes","photographers","infections","jeffrey","chess","operates","brisbane","configured","survive","oscar","festivals","menus","joan","possibilities","duck","reveal","canal","amino","phi","contributing","herbs","clinics","mls","cow","manitoba","analytical","missions","watson","lying","costumes","strict","dive","saddam","circulation","drill","offense","bryan","cet","protest","assumption","jerusalem","hobby","tries","transexuales","invention","nickname","fiji","technician","inline","executives","enquiries","washing","audi","staffing","cognitive","exploring","trick","enquiry","closure","raid","ppc","timber","volt","intense","div","playlist","registrar","showers","supporters","ruling","steady","dirt","statutes","withdrawal","myers","drops","predicted","wider","saskatchewan","jc","cancellation","plugins","enrolled","sensors","screw","ministers","publicly","hourly","blame","geneva","freebsd","veterinary","acer","prostores","reseller","dist","handed","suffered","intake","informal","relevance","incentive","butterfly","tucson","mechanics","heavily","swingers","fifty","headers","mistakes","numerical","ons","geek","uncle","defining","xnxx","counting","reflection","sink","accompanied","assure","invitation","devoted","princeton","jacob","sodium","randy","spirituality","hormone","meanwhile","proprietary","timothy","childrens","brick","grip","naval","thumbzilla","medieval","porcelain","avi","bridges","pichunter","captured","watt","thehun","decent","casting","dayton","translated","shortly","cameron","columnists","pins","carlos","reno","donna","andreas","warrior","diploma","cabin","innocent","scanning","ide","consensus","polo","valium","copying","rpg","delivering","cordless","patricia","horn","eddie","uganda","fired","journalism","pd","prot","trivia","adidas","perth","frog","grammar","intention","syria","disagree","klein","harvey","tires","logs","undertaken","tgp","hazard","retro","leo","livesex","statewide","semiconductor","gregory","episodes","boolean","circular","anger","diy","mainland","illustrations","suits","chances","interact","snap","happiness","arg","substantially","bizarre","glenn","ur","auckland","olympics","fruits","identifier","geo","worldsex","ribbon","calculations","doe","jpeg","conducting","startup","suzuki","trinidad","ati","kissing","wal","handy","swap","exempt","crops","reduces","accomplished","calculators","geometry","impression","abs","slovakia","flip","guild","correlation","gorgeous","capitol","sim","dishes","rna","barbados","chrysler","nervous","refuse","extends","fragrance","mcdonald","replica","plumbing","brussels","tribe","neighbors","trades","superb","buzz","transparent","nuke","rid","trinity","charleston","handled","legends","boom","calm","champions","floors","selections","projectors","inappropriate","exhaust","comparing","shanghai","speaks","burton","vocational","davidson","copied","scotia","farming","gibson","pharmacies","fork","troy","ln","roller","introducing","batch","organize","appreciated","alter","nicole","latino","ghana","edges","uc","mixing","handles","skilled","fitted","albuquerque","harmony","distinguished","asthma","projected","assumptions","shareholders","twins","developmental","rip","zope","regulated","triangle","amend","anticipated","oriental","reward","windsor","zambia","completing","gmbh","buf","ld","hydrogen","webshots","sprint","comparable","chick","advocate","sims","confusion","copyrighted","tray","inputs","warranties","genome","escorts","documented","thong","medal","paperbacks","coaches","vessels","harbour","walks","sol","keyboards","sage","knives","eco","vulnerable","arrange","artistic","bat","honors","booth","indie","reflected","unified","bones","breed","detector","ignored","polar","fallen","precise","sussex","respiratory","notifications","msgid","transexual","mainstream","invoice","evaluating","lip","subcommittee","sap","gather","suse","maternity","backed","alfred","colonial","mf","carey","motels","forming","embassy","cave","journalists","danny","rebecca","slight","proceeds","indirect","amongst","wool","foundations","msgstr","arrest","volleyball","mw","adipex","horizon","nu","deeply","toolbox","ict","marina","liabilities","prizes","bosnia","browsers","decreased","patio","dp","tolerance","surfing","creativity","lloyd","describing","optics","pursue","lightning","overcome","eyed","ou","quotations","grab","inspector","attract","brighton","beans","bookmarks","ellis","disable","snake","succeed","leonard","lending","oops","reminder","xi","searched","behavioral","riverside","bathrooms","plains","sku","ht","raymond","insights","abilities","initiated","sullivan","za","midwest","karaoke","trap","lonely","fool","ve","nonprofit","lancaster","suspended","hereby","observe","julia","containers","attitudes","karl","berry","collar","simultaneously","racial","integrate","bermuda","amanda","sociology","mobiles","screenshot","exhibitions","kelkoo","confident","retrieved","exhibits","officially","consortium","dies","terrace","bacteria","pts","replied","seafood","novels","rh","rrp","recipients","ought","delicious","traditions","fg","jail","safely","finite","kidney","periodically","fixes","sends","durable","mazda","allied","throws","moisture","hungarian","roster","referring","symantec","spencer","wichita","nasdaq","uruguay","ooo","hz","transform","timer","tablets","tuning","gotten","educators","tyler","futures","vegetable","verse","highs","humanities","independently","wanting","custody","scratch","launches","ipaq","alignment","masturbating","henderson","bk","britannica","comm","ellen","competitors","nhs","rocket","aye","bullet","towers","racks","lace","nasty","visibility","latitude","consciousness","ste","tumor","ugly","deposits","beverly","mistress","encounter","trustees","watts","duncan","reprints","hart","bernard","resolutions","ment","accessing","forty","tubes","attempted","col","midlands","priest","floyd","ronald","analysts","queue","dx","sk","trance","locale","nicholas","biol","yu","bundle","hammer","invasion","witnesses","runner","rows","administered","notion","sq","skins","mailed","oc","fujitsu","spelling","arctic","exams","rewards","beneath","strengthen","defend","aj","frederick","medicaid","treo","infrared","seventh","gods","une","welsh","belly","aggressive","tex","advertisements","quarters","stolen","cia","sublimedirectory","soonest","haiti","disturbed","determines","sculpture","poly","ears","dod","wp","fist","naturals","neo","motivation","lenders","pharmacology","fitting","fixtures","bloggers","mere","agrees","passengers","quantities","petersburg","consistently","powerpoint","cons","surplus","elder","sonic","obituaries","cheers","dig","taxi","punishment","appreciation","subsequently","om","belarus","nat","zoning","gravity","providence","thumb","restriction","incorporate","backgrounds","treasurer","guitars","essence","flooring","lightweight","ethiopia","tp","mighty","athletes","humanity","transcription","jm","holmes","complications","scholars","dpi","scripting","gis","remembered","galaxy","chester","snapshot","caring","loc","worn","synthetic","shaw","vp","segments","testament","expo","dominant","twist","specifics","itunes","stomach","partially","buried","cn","newbie","minimize","darwin","ranks","wilderness","debut","generations","tournaments","bradley","deny","anatomy","bali","judy","sponsorship","headphones","fraction","trio","proceeding","cube","defects","volkswagen","uncertainty","breakdown","milton","marker","reconstruction","subsidiary","strengths","clarity","rugs","sandra","adelaide","encouraging","furnished","monaco","settled","folding","emirates","terrorists","airfare","comparisons","beneficial","distributions","vaccine","belize","fate","viewpicture","promised","volvo","penny","robust","bookings","threatened","minolta","republicans","discusses","gui","porter","gras","jungle","ver","rn","responded","rim","abstracts","zen","ivory","alpine","dis","prediction","pharmaceuticals","andale","fabulous","remix","alias","thesaurus","individually","battlefield","literally","newer","kay","ecological","spice","oval","implies","cg","soma","ser","cooler","appraisal","consisting","maritime","periodic","submitting","overhead","ascii","prospect","shipment","breeding","citations","geographical","donor","mozambique","tension","href","benz","trash","shapes","wifi","tier","fwd","earl","manor","envelope","diane","homeland","disclaimers","championships","excluded","andrea","breeds","rapids","disco","sheffield","bailey","aus","endif","finishing","emotions","wellington","incoming","prospects","lexmark","cleaners","bulgarian","hwy","eternal","cashiers","guam","cite","aboriginal","remarkable","rotation","nam","preventing","productive","boulevard","eugene","ix","gdp","pig","metric","compliant","minus","penalties","bennett","imagination","hotmail","refurbished","joshua","armenia","varied","grande","closest","activated","actress","mess","conferencing","assign","armstrong","politicians","trackbacks","lit","accommodate","tigers","aurora","una","slides","milan","premiere","lender","villages","shade","chorus","christine","rhythm","digit","argued","dietary","symphony","clarke","sudden","accepting","precipitation","marilyn","lions","findlaw","ada","pools","tb","lyric","claire","isolation","speeds","sustained","matched","approximate","rope","carroll","rational","programmer","fighters","chambers","dump","greetings","inherited","warming","incomplete","vocals","chronicle","fountain","chubby","grave","legitimate","biographies","burner","yrs","foo","investigator","gba","plaintiff","finnish","gentle","bm","prisoners","deeper","muslims","hose","mediterranean","nightlife","footage","howto","worthy","reveals","architects","saints","entrepreneur","carries","sig","freelance","duo","excessive","devon","screensaver","helena","saves","regarded","valuation","unexpected","cigarette","fog","characteristic","marion","lobby","egyptian","tunisia","metallica","outlined","consequently","headline","treating","punch","appointments","str","gotta","cowboy","narrative","bahrain","enormous","karma","consist","betty","queens","academics","pubs","quantitative","shemales","lucas","screensavers","subdivision","tribes","vip","defeat","clicks","distinction","honduras","naughty","hazards","insured","harper","livestock","mardi","exemption","tenant","sustainability","cabinets","tattoo","shake","algebra","shadows","holly","formatting","silly","nutritional","yea","mercy","hartford","freely","marcus","sunrise","wrapping","mild","fur","nicaragua","weblogs","timeline","tar","belongs","rj","readily","affiliation","soc","fence","nudist","infinite","diana","ensures","relatives","lindsay","clan","legally","shame","satisfactory","revolutionary","bracelets","sync","civilian","telephony","mesa","fatal","remedy","realtors","breathing","briefly","thickness","adjustments","graphical","genius","discussing","aerospace","fighter","meaningful","flesh","retreat","adapted","barely","wherever","estates","rug","democrat","borough","maintains","failing","shortcuts","ka","retained","voyeurweb","pamela","andrews","marble","extending","jesse","specifies","hull","logitech","surrey","briefing","belkin","dem","accreditation","wav","blackberry","highland","meditation","modular","microphone","macedonia","combining","brandon","instrumental","giants","organizing","shed","balloon","moderators","winston","memo","ham","solved","tide","kazakhstan","hawaiian","standings","partition","invisible","gratuit","consoles","funk","fbi","qatar","magnet","translations","porsche","cayman","jaguar","reel","sheer","commodity","posing","kilometers","rp","bind","thanksgiving","rand","hopkins","urgent","guarantees","infants","gothic","cylinder","witch","buck","indication","eh","congratulations","tba","cohen","sie","usgs","puppy","kathy","acre","graphs","surround","cigarettes","revenge","expires","enemies","lows","controllers","aqua","chen","emma","consultancy","finances","accepts","enjoying","conventions","eva","patrol","smell","pest","hc","italiano","coordinates","rca","fp","carnival","roughly","sticker","promises","responding","reef","physically","divide","stakeholders","hydrocodone","gst","consecutive","cornell","satin","bon","deserve","attempting","mailto","promo","jj","representations","chan","worried","tunes","garbage","competing","combines","mas","beth","bradford","len","phrases","kai","peninsula","chelsea","boring","reynolds","dom","jill","accurately","speeches","reaches","schema","considers","sofa","catalogs","ministries","vacancies","quizzes","parliamentary","obj","prefix","lucia","savannah","barrel","typing","nerve","dans","planets","deficit","boulder","pointing","renew","coupled","viii","myanmar","metadata","harold","circuits","floppy","texture","handbags","jar","ev","somerset","incurred","acknowledge","thoroughly","antigua","nottingham","thunder","tent","caution","identifies","questionnaire","qualification","locks","modelling","namely","miniature","dept","hack","dare","euros","interstate","pirates","aerial","hawk","consequence","rebel","systematic","perceived","origins","hired","makeup","textile","lamb","madagascar","nathan","tobago","presenting","cos","troubleshooting","uzbekistan","indexes","pac","rl","erp","centuries","gl","magnitude","ui","richardson","hindu","dh","fragrances","vocabulary","licking","earthquake","vpn","fundraising","fcc","markers","weights","albania","geological","assessing","lasting","wicked","eds","introduces","kills","roommate","webcams","pushed","webmasters","ro","df","computational","acdbentity","participated","junk","handhelds","wax","lucy","answering","hans","impressed","slope","reggae","failures","poet","conspiracy","surname","theology","nails","evident","whats","rides","rehab","epic","saturn","organizer","nut","allergy","sake","twisted","combinations","preceding","merit","enzyme","cumulative","zshops","planes","edmonton","tackle","disks","condo","pokemon","amplifier","ambien","arbitrary","prominent","retrieve","lexington","vernon","sans","worldcat","titanium","irs","fairy","builds","contacted","shaft","lean","bye","cdt","recorders","occasional","leslie","casio","deutsche","ana","postings","innovations","kitty","postcards","dude","drain","monte","fires","algeria","blessed","luis","reviewing","cardiff","cornwall","favors","potato","panic","explicitly","sticks","leone","transsexual","ez","citizenship","excuse","reforms","basement","onion","strand","pf","sandwich","uw","lawsuit","alto","informative","girlfriend","bloomberg","cheque","hierarchy","influenced","banners","reject","eau","abandoned","bd","circles","italic","beats","merry","mil","scuba","gore","complement","cult","dash","passive","mauritius","valued","cage","checklist","bangbus","requesting","courage","verde","lauderdale","scenarios","gazette","hitachi","divx","extraction","batman","elevation","hearings","coleman","hugh","lap","utilization","beverages","calibration","jake","eval","efficiently","anaheim","ping","textbook","dried","entertaining","prerequisite","luther","frontier","settle","stopping","refugees","knights","hypothesis","palmer","medicines","flux","derby","sao","peaceful","altered","pontiac","regression","doctrine","scenic","trainers","muze","enhancements","renewable","intersection","passwords","sewing","consistency","collectors","conclude","recognised","munich","oman","celebs","gmc","propose","hh","azerbaijan","lighter","rage","adsl","uh","prix","astrology","advisors","pavilion","tactics","trusts","occurring","supplemental","travelling","talented","annie","pillow","induction","derek","precisely","shorter","harley","spreading","provinces","relying","finals","paraguay","steal","parcel","refined","fd","bo","fifteen","widespread","incidence","fears","predict","boutique","acrylic","rolled","tuner","avon","incidents","peterson","rays","asn","shannon","toddler","enhancing","flavor","alike","walt","homeless","horrible","hungry","metallic","acne","blocked","interference","warriors","palestine","listprice","libs","undo","cadillac","atmospheric","malawi","wm","pk","sagem","knowledgestorm","dana","halo","ppm","curtis","parental","referenced","strikes","lesser","publicity","marathon","ant","proposition","gays","pressing","gasoline","apt","dressed","scout","belfast","exec","dealt","niagara","inf","eos","warcraft","charms","catalyst","trader","bucks","allowance","vcr","denial","uri","designation","thrown","prepaid","raises","gem","duplicate","electro","criterion","badge","wrist","civilization","analyzed","vietnamese","heath","tremendous","ballot","lexus","varying","remedies","validity","trustee","maui","handjobs","weighted","angola","squirt","performs","plastics","realm","corrected","jenny","helmet","salaries","postcard","elephant","yemen","encountered","tsunami","scholar","nickel","internationally","surrounded","psi","buses","expedia","geology","pct","wb","creatures","coating","commented","wallet","cleared","smilies","vids","accomplish","boating","drainage","shakira","corners","broader","vegetarian","rouge","yeast","yale","newfoundland","sn","qld","pas","clearing","investigated","dk","ambassador","coated","intend","stephanie","contacting","vegetation","doom","findarticles","louise","kenny","specially","owen","routines","hitting","yukon","beings","bite","issn","aquatic","reliance","habits","striking","myth","infectious","podcasts","singh","gig","gilbert","sas","ferrari","continuity","brook","fu","outputs","phenomenon","ensemble","insulin","assured","biblical","weed","conscious","accent","mysimon","eleven","wives","ambient","utilize","mileage","oecd","prostate","adaptor","auburn","unlock","hyundai","pledge","vampire","angela","relates","nitrogen","xerox","dice","merger","softball","referrals","quad","dock","differently","firewire","mods","nextel","framing","organised","musician","blocking","rwanda","sorts","integrating","vsnet","limiting","dispatch","revisions","papua","restored","hint","armor","riders","chargers","remark","dozens","varies","msie","reasoning","wn","liz","rendered","picking","charitable","guards","annotated","ccd","sv","convinced","openings","buys","burlington","replacing","researcher","watershed","councils","occupations","acknowledged","kruger","pockets","granny","pork","zu","equilibrium","viral","inquire","pipes","characterized","laden","aruba","cottages","realtor","merge","privilege","edgar","develops","qualifying","chassis","dubai","estimation","barn","pushing","llp","fleece","pediatric","boc","fare","dg","asus","pierce","allan","dressing","techrepublic","sperm","vg","bald","filme","craps","fuji","frost","leon","institutes","mold","dame","fo","sally","yacht","tracy","prefers","drilling","brochures","herb","tmp","alot","ate","breach","whale","traveller","appropriations","suspected","tomatoes","benchmark","beginners","instructors","highlighted","bedford","stationery","idle","mustang","unauthorized","clusters","antibody","competent","momentum","fin","wiring","io","pastor","mud","calvin","uni","shark","contributor","demonstrates","phases","grateful","emerald","gradually","laughing","grows","cliff","desirable","tract","ul","ballet","ol","journalist","abraham","js","bumper","afterwards","webpage","religions","garlic","hostels","shine","senegal","explosion","pn","banned","wendy","briefs","signatures","diffs","cove","mumbai","ozone","disciplines","casa","mu","daughters","conversations","radios","tariff","nvidia","opponent","pasta","simplified","muscles","serum","wrapped","swift","motherboard","runtime","inbox","focal","bibliographic","eden","distant","incl","champagne","ala","decimal","hq","deviation","superintendent","propecia","dip","nbc","samba","hostel","housewives","employ","mongolia","penguin","magical","influences","inspections","irrigation","miracle","manually","reprint","reid","wt","hydraulic","centered","robertson","flex","yearly","penetration","wound","belle","rosa","conviction","hash","omissions","writings","hamburg","lazy","mv","mpg","retrieval","qualities","cindy","fathers","carb","charging","cas","marvel","lined","cio","dow","prototype","importantly","rb","petite","apparatus","upc","terrain","dui","pens","explaining","yen","strips","gossip","rangers","nomination","empirical","mh","rotary","worm","dependence","discrete","beginner","boxed","lid","sexuality","polyester","cubic","deaf","commitments","suggesting","sapphire","kinase","skirts","mats","remainder","crawford","labeled","privileges","televisions","specializing","marking","commodities","pvc","serbia","sheriff","griffin","declined","guyana","spies","blah","mime","neighbor","motorcycles","elect","highways","thinkpad","concentrate","intimate","reproductive","preston","deadly","feof","bunny","chevy","molecules","rounds","longest","refrigerator","tions","intervals","sentences","dentists","usda","exclusion","workstation","holocaust","keen","flyer","peas","dosage","receivers","urls","customise","disposition","variance","navigator","investigators","cameroon","baking","marijuana","adaptive","computed","needle","baths","enb","gg","cathedral","brakes","og","nirvana","ko","fairfield","owns","til","invision","sticky","destiny","generous","madness","emacs","climb","blowing","fascinating","landscapes","heated","lafayette","jackie","wto","computation","hay","cardiovascular","ww","sparc","cardiac","salvation","dover","adrian","predictions","accompanying","vatican","brutal","learners","gd","selective","arbitration","configuring","token","editorials","zinc","sacrifice","seekers","guru","isa","removable","convergence","yields","gibraltar","levy","suited","numeric","anthropology","skating","kinda","aberdeen","emperor","grad","malpractice","dylan","bras","belts","blacks","educated","rebates","reporters","burke","proudly","pix","necessity","rendering","mic","inserted","pulling","basename","kyle","obesity","curves","suburban","touring","clara","vertex","bw","hepatitis","nationally","tomato","andorra","waterproof","expired","mj","travels","flush","waiver","pale","specialties","hayes","humanitarian","invitations","functioning","delight","survivor","garcia","cingular","economies","alexandria","bacterial","moses","counted","undertake","declare","continuously","johns","valves","gaps","impaired","achievements","donors","tear","jewel","teddy","lf","convertible","ata","teaches","ventures","nil","bufing","stranger","tragedy","julian","nest","pam","dryer","painful","velvet","tribunal","ruled","nato","pensions","prayers","funky","secretariat","nowhere","cop","paragraphs","gale","joins","adolescent","nominations","wesley","dim","lately","cancelled","scary","mattress","mpegs","brunei","likewise","banana","introductory","slovak","cakes","stan","reservoir","occurrence","idol","mixer","remind","wc","worcester","sbjct","demographic","charming","mai","tooth","disciplinary","annoying","respected","stays","disclose","affair","drove","washer","upset","restrict","springer","beside","mines","portraits","rebound","logan","mentor","interpreted","evaluations","fought","baghdad","elimination","metres","hypothetical","immigrants","complimentary","helicopter","pencil","freeze","hk","performer","abu","titled","commissions","sphere","powerseller","moss","ratios","concord","graduated","endorsed","ty","surprising","walnut","lance","ladder","italia","unnecessary","dramatically","liberia","sherman","cork","maximize","cj","hansen","senators","workout","mali","yugoslavia","bleeding","characterization","colon","likelihood","lanes","purse","fundamentals","contamination","mtv","endangered","compromise","masturbation","optimize","stating","dome","caroline","leu","expiration","namespace","align","peripheral","bless","engaging","negotiation","crest","opponents","triumph","nominated","confidentiality","electoral","changelog","welding","deferred","alternatively","heel","alloy","condos","plots","polished","yang","gently","greensboro","tulsa","locking","casey","controversial","draws","fridge","blanket","bloom","qc","simpsons","lou","elliott","recovered","fraser","justify","upgrading","blades","pgp","loops","surge","frontpage","trauma","aw","tahoe","advert","possess","demanding","defensive","sip","flashers","subaru","forbidden","tf","vanilla","programmers","pj","monitored","installations","deutschland","picnic","souls","arrivals","spank","cw","practitioner","motivated","wr","dumb","smithsonian","hollow","vault","securely","examining","fioricet","groove","revelation","rg","pursuit","delegation","wires","bl","dictionaries","mails","backing","greenhouse","sleeps","vc","blake","transparency","dee","travis","wx","endless","figured","orbit","currencies","niger","bacon","survivors","positioning","heater","colony","cannon","circus","promoted","forbes","mae","moldova","mel","descending","paxil","spine","trout","enclosed","feat","temporarily","ntsc","cooked","thriller","transmit","apnic","fatty","gerald","pressed","frequencies","scanned","reflections","hunger","mariah","sic","municipality","usps","joyce","detective","surgeon","cement","experiencing","fireplace","endorsement","bg","planners","disputes","textiles","missile","intranet","closes","seq","psychiatry","persistent","deborah","conf","marco","assists","summaries","glow","gabriel","auditor","wma","aquarium","violin","prophet","cir","bracket","looksmart","isaac","oxide","oaks","magnificent","erik","colleague","naples","promptly","modems","adaptation","hu","harmful","paintball","prozac","sexually","enclosure","acm","dividend","newark","kw","paso","glucose","phantom","norm","playback","supervisors","westminster","turtle","ips","distances","absorption","treasures","dsc","warned","neural","ware","fossil","mia","hometown","badly","transcripts","apollo","wan","disappointed","persian","continually","communist","collectible","handmade","greene","entrepreneurs","robots","grenada","creations","jade","scoop","acquisitions","foul","keno","gtk","earning","mailman","sanyo","nested","biodiversity","excitement","somalia","movers","verbal","blink","presently","seas","carlo","workflow","mysterious","novelty","bryant","tiles","voyuer","librarian","subsidiaries","switched","stockholm","tamil","garmin","ru","pose","fuzzy","indonesian","grams","therapist","richards","mrna","budgets","toolkit","promising","relaxation","goat","render","carmen","ira","sen","thereafter","hardwood","erotica","temporal","sail","forge","commissioners","dense","dts","brave","forwarding","qt","awful","nightmare","airplane","reductions","southampton","istanbul","impose","organisms","sega","telescope","viewers","asbestos","portsmouth","cdna","meyer","enters","pod","savage","advancement","wu","harassment","willow","resumes","bolt","gage","throwing","existed","generators","lu","wagon","barbie","dat","favour","soa","knock","urge","smtp","generates","potatoes","thorough","replication","inexpensive","kurt","receptors","peers","roland","optimum","neon","interventions","quilt","huntington","creature","ours","mounts","syracuse","internship","lone","refresh","aluminium","snowboard","beastality","webcast","michel","evanescence","subtle","coordinated","notre","shipments","maldives","stripes","firmware","antarctica","cope","shepherd","lm","canberra","cradle","chancellor","mambo","lime","kirk","flour","controversy","legendary","bool","sympathy","choir","avoiding","beautifully","blond","expects","cho","jumping","fabrics","antibodies","polymer","hygiene","wit","poultry","virtue","burst","examinations","surgeons","bouquet","immunology","promotes","mandate","wiley","departmental","bbs","spas","ind","corpus","johnston","terminology","gentleman","fibre","reproduce","convicted","shades","jets","indices","roommates","adware","qui","intl","threatening","spokesman","zoloft","activists","frankfurt","prisoner","daisy","halifax","encourages","ultram","cursor","assembled","earliest","donated","stuffed","restructuring","insects","terminals","crude","morrison","maiden","simulations","cz","sufficiently","examines","viking","myrtle","bored","cleanup","yarn","knit","conditional","mug","crossword","bother","budapest","conceptual","knitting","attacked","hl","bhutan","liechtenstein","mating","compute","redhead","arrives","translator","automobiles","tractor","allah","continent","ob","unwrap","fares","longitude","resist","challenged","telecharger","hoped","pike","safer","insertion","instrumentation","ids","hugo","wagner","constraint","groundwater","touched","strengthening","cologne","gzip","wishing","ranger","smallest","insulation","newman","marsh","ricky","ctrl","scared","theta","infringement","bent","laos","subjective","monsters","asylum","lightbox","robbie","stake","cocktail","outlets","swaziland","varieties","arbor","mediawiki","configurations","poison",""];

/* 
 Ask for word suggestions that would fit in a certain pattern.
 The pattern is defined by using ?'s for the blank letters
 A maximum of three and a minimum of no words are returned.
 If the resulting set is more than three words, the resulting three 
 will be selected randomly.
 eg. "?x??r?" might suggest "jxword"
*/
function suggest(pattern) {
    pattern = pattern.toLowerCase();
    // First let's just consider words of the correct length
    let matches = words.filter(word => word.length === pattern.length);
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] !== "?") {
            matches = matches.filter(word => word[i] === pattern[i]);
        }
    }
    if (matches.length <= 3) return matches;
    let result = [];
    for (let i = 0; i < 3; i++) {
        let index = Math.random() * matches.length;
        result.push(...matches.splice(index, 1));
    }
    return result;
}

/* src/Question.svelte generated by Svelte v3.46.4 */

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	return child_ctx;
}

// (84:4) {:else}
function create_else_block$1(ctx) {
	let div1;
	let span0;
	let t0_value = /*question*/ ctx[0].num + "";
	let t0;
	let t1;
	let t2;
	let span1;
	let t3_value = (/*question*/ ctx[0].question || "No question set") + "";
	let t3;
	let t4;
	let span2;
	let t5;
	let t6_value = /*question*/ ctx[0].answer + "";
	let t6;
	let t7;
	let div0;
	let mounted;
	let dispose;
	let if_block = /*suggestions*/ ctx[1].length && create_if_block_1$1(ctx);

	return {
		c() {
			div1 = element("div");
			span0 = element("span");
			t0 = text(t0_value);
			t1 = text(":");
			t2 = space();
			span1 = element("span");
			t3 = text(t3_value);
			t4 = space();
			span2 = element("span");
			t5 = text("~ ");
			t6 = text(t6_value);
			t7 = space();
			div0 = element("div");
			if (if_block) if_block.c();
			attr(span0, "class", "jxword-question-num");
			attr(span1, "class", "jxword-question-question");
			attr(span2, "class", "jxword-question-answer");
			attr(div0, "class", "jxword-suggestions");
			attr(div1, "class", "jxword-question svelte-tw6vzm");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span0);
			append(span0, t0);
			append(span0, t1);
			append(div1, t2);
			append(div1, span1);
			append(span1, t3);
			append(div1, t4);
			append(div1, span2);
			append(span2, t5);
			append(span2, t6);
			append(div1, t7);
			append(div1, div0);
			if (if_block) if_block.m(div0, null);

			if (!mounted) {
				dispose = listen(div1, "dblclick", function () {
					if (is_function(/*editQuestion*/ ctx[3](/*question*/ ctx[0]))) /*editQuestion*/ ctx[3](/*question*/ ctx[0]).apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*question*/ 1 && t0_value !== (t0_value = /*question*/ ctx[0].num + "")) set_data(t0, t0_value);
			if (dirty & /*question*/ 1 && t3_value !== (t3_value = (/*question*/ ctx[0].question || "No question set") + "")) set_data(t3, t3_value);
			if (dirty & /*question*/ 1 && t6_value !== (t6_value = /*question*/ ctx[0].answer + "")) set_data(t6, t6_value);

			if (/*suggestions*/ ctx[1].length) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1$1(ctx);
					if_block.c();
					if_block.m(div0, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (73:4) {#if question.editing}
function create_if_block$1(ctx) {
	let div3;
	let div0;
	let span;
	let t0_value = /*question*/ ctx[0].num + "";
	let t0;
	let t1;
	let input;
	let t2;
	let div1;
	let t3_value = /*question*/ ctx[0].answer + "";
	let t3;
	let t4;
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
			input = element("input");
			t2 = space();
			div1 = element("div");
			t3 = text(t3_value);
			t4 = space();
			div2 = element("div");
			div2.textContent = "Save";
			attr(div0, "class", "jxword-question-number");
			attr(input, "type", "text");
			attr(input, "class", "jxword-question-text");
			input.autofocus = true;
			attr(div1, "class", "jxword-question-answer");
			attr(div2, "class", "btn svelte-tw6vzm");
			attr(div3, "class", "jxword-question jxword-question-editing svelte-tw6vzm");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			append(div0, span);
			append(span, t0);
			append(div3, t1);
			append(div3, input);
			set_input_value(input, /*question*/ ctx[0].question);
			append(div3, t2);
			append(div3, div1);
			append(div1, t3);
			append(div3, t4);
			append(div3, div2);
			input.focus();

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[12]),
					listen(input, "keydown", /*handleKeydown*/ ctx[5]),
					listen(div2, "click", function () {
						if (is_function(/*saveQuestion*/ ctx[4](/*question*/ ctx[0]))) /*saveQuestion*/ ctx[4](/*question*/ ctx[0]).apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*question*/ 1 && t0_value !== (t0_value = /*question*/ ctx[0].num + "")) set_data(t0, t0_value);

			if (dirty & /*question*/ 1 && input.value !== /*question*/ ctx[0].question) {
				set_input_value(input, /*question*/ ctx[0].question);
			}

			if (dirty & /*question*/ 1 && t3_value !== (t3_value = /*question*/ ctx[0].answer + "")) set_data(t3, t3_value);
		},
		d(detaching) {
			if (detaching) detach(div3);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (88:8) {#if suggestions.length}
function create_if_block_1$1(ctx) {
	let each_1_anchor;
	let each_value = /*suggestions*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
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
			if (dirty & /*useSuggestion, suggestions*/ 66) {
				each_value = /*suggestions*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (89:12) {#each suggestions as suggestion}
function create_each_block$3(ctx) {
	let span;
	let t_value = /*suggestion*/ ctx[16] + "";
	let t;
	let mounted;
	let dispose;

	return {
		c() {
			span = element("span");
			t = text(t_value);
			attr(span, "class", "jxword-suggestion svelte-tw6vzm");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);

			if (!mounted) {
				dispose = listen(span, "click", function () {
					if (is_function(/*useSuggestion*/ ctx[6](/*suggestion*/ ctx[16]))) /*useSuggestion*/ ctx[6](/*suggestion*/ ctx[16]).apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*suggestions*/ 2 && t_value !== (t_value = /*suggestion*/ ctx[16] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$6(ctx) {
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
			attr(main, "class", "svelte-tw6vzm");
			toggle_class(main, "current", /*is_current_question*/ ctx[2]);
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

			if (dirty & /*is_current_question*/ 4) {
				toggle_class(main, "current", /*is_current_question*/ ctx[2]);
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

function instance$6($$self, $$props, $$invalidate) {
	let $currentDirection;
	let $currentQuestion;
	let $questionsAcross;
	let $questionsDown;
	component_subscribe($$self, currentDirection, $$value => $$invalidate(10, $currentDirection = $$value));
	component_subscribe($$self, currentQuestion, $$value => $$invalidate(11, $currentQuestion = $$value));
	component_subscribe($$self, questionsAcross, $$value => $$invalidate(13, $questionsAcross = $$value));
	component_subscribe($$self, questionsDown, $$value => $$invalidate(14, $questionsDown = $$value));
	const dispatch = createEventDispatcher();
	let { questions_across = [] } = $$props;
	let { questions_down = [] } = $$props;
	let { question } = $$props;
	let { direction } = $$props;

	// Private props
	let suggestions = [];

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

	function useSuggestion(suggestion) {
		suggestion = suggestion.toUpperCase();
		let qs = $questionsDown;

		if (question.direction === "across") {
			qs = $questionsAcross;
		}

		qs[qs.findIndex(q => q.num === question.num)];
		let q = qs.find(q => q.num === question.num);
		dispatch("update_question", { suggestion, question: q });
	}

	let is_current_question = false;

	function input_input_handler() {
		question.question = this.value;
		$$invalidate(0, question);
	}

	$$self.$$set = $$props => {
		if ('questions_across' in $$props) $$invalidate(7, questions_across = $$props.questions_across);
		if ('questions_down' in $$props) $$invalidate(8, questions_down = $$props.questions_down);
		if ('question' in $$props) $$invalidate(0, question = $$props.question);
		if ('direction' in $$props) $$invalidate(9, direction = $$props.direction);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*question, $currentQuestion, $currentDirection*/ 3073) {
			{
				let suggestion_query = question.answer.replace(/\ /g, "?");

				if (!suggestion_query.includes("?")) {
					$$invalidate(1, suggestions = []);
				} else {
					$$invalidate(1, suggestions = suggest(suggestion_query));
				}

				if ($currentQuestion) {
					$$invalidate(2, is_current_question = $currentQuestion.num === question.num && $currentDirection === question.direction);
				}
			}
		}
	};

	return [
		question,
		suggestions,
		is_current_question,
		editQuestion,
		saveQuestion,
		handleKeydown,
		useSuggestion,
		questions_across,
		questions_down,
		direction,
		$currentDirection,
		$currentQuestion,
		input_input_handler
	];
}

class Question extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
			questions_across: 7,
			questions_down: 8,
			question: 0,
			direction: 9
		});
	}
}

/* src/Questions.svelte generated by Svelte v3.46.4 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

function get_each_context_1$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (5:16) {#each questions_across as question}
function create_each_block_1$2(ctx) {
	let question;
	let current;

	question = new Question({
			props: {
				question: /*question*/ ctx[6],
				direction: "across",
				questions_across: /*questions_across*/ ctx[0]
			}
		});

	question.$on("change", /*change_handler*/ ctx[2]);
	question.$on("update_question", /*update_question_handler*/ ctx[3]);

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
			if (dirty & /*questions_across*/ 1) question_changes.question = /*question*/ ctx[6];
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
function create_each_block$2(ctx) {
	let question;
	let current;

	question = new Question({
			props: {
				question: /*question*/ ctx[6],
				direction: "down",
				questions_down: /*questions_down*/ ctx[1]
			}
		});

	question.$on("change", /*change_handler_1*/ ctx[4]);
	question.$on("update_question", /*update_question_handler_1*/ ctx[5]);

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
			if (dirty & /*questions_down*/ 2) question_changes.question = /*question*/ ctx[6];
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

function create_fragment$5(ctx) {
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
		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
		each_blocks_1[i] = null;
	});

	let each_value = /*questions_down*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
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
			attr(div1, "class", "jxword-questions-direction jxword-questions-down svelte-1jm0aq5");
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
					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
						transition_in(each_blocks_1[i], 1);
					} else {
						each_blocks_1[i] = create_each_block_1$2(child_ctx);
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
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
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

function instance$5($$self, $$props, $$invalidate) {
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

	function update_question_handler(event) {
		bubble.call(this, $$self, event);
	}

	function change_handler_1(event) {
		bubble.call(this, $$self, event);
	}

	function update_question_handler_1(event) {
		bubble.call(this, $$self, event);
	}

	return [
		questions_across,
		questions_down,
		change_handler,
		update_question_handler,
		change_handler_1,
		update_question_handler_1
	];
}

class Questions extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
	}
}

/* src/Grid.svelte generated by Svelte v3.46.4 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[60] = list[i];
	child_ctx[62] = i;
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[63] = list[i];
	child_ctx[65] = i;
	return child_ctx;
}

// (467:28) {:else}
function create_else_block(ctx) {
	let rect;
	let rect_y_value;
	let rect_x_value;
	let text_1;
	let t_value = /*letter*/ ctx[63] + "";
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
			attr(rect, "class", "jxword-cell-rect svelte-1013j5m");
			attr(rect, "role", "cell");
			attr(rect, "tabindex", "-1");
			attr(rect, "aria-label", "");
			attr(rect, "y", rect_y_value = /*cellWidth*/ ctx[18] * /*y*/ ctx[62] + /*margin*/ ctx[9]);
			attr(rect, "x", rect_x_value = /*cellHeight*/ ctx[22] * /*x*/ ctx[65] + /*margin*/ ctx[9]);
			attr(rect, "width", /*cellWidth*/ ctx[18]);
			attr(rect, "height", /*cellHeight*/ ctx[22]);
			attr(rect, "stroke", /*innerBorderColour*/ ctx[11]);
			attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			attr(rect, "fill", /*backgroundColour*/ ctx[13]);
			attr(rect, "data-col", /*x*/ ctx[65]);
			attr(rect, "data-row", /*y*/ ctx[62]);
			attr(text_1, "class", "jxword-no-print-blank svelte-1013j5m");
			attr(text_1, "id", "jxword-letter-" + /*x*/ ctx[65] + "-" + /*y*/ ctx[62]);
			attr(text_1, "x", text_1_x_value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2);
			attr(text_1, "y", text_1_y_value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*cellHeight*/ ctx[22] - /*cellHeight*/ ctx[22] * 0.1);
			attr(text_1, "text-anchor", "middle");
			attr(text_1, "font-size", /*fontSize*/ ctx[20]);
			attr(text_1, "width", /*cellWidth*/ ctx[18]);
		},
		m(target, anchor) {
			insert(target, rect, anchor);
			insert(target, text_1, anchor);
			append(text_1, t);

			if (!mounted) {
				dispose = [
					listen(rect, "focus", /*handleFocus*/ ctx[26]),
					listen(text_1, "focus", /*handleFocus*/ ctx[26])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cellWidth, margin*/ 262656 && rect_y_value !== (rect_y_value = /*cellWidth*/ ctx[18] * /*y*/ ctx[62] + /*margin*/ ctx[9])) {
				attr(rect, "y", rect_y_value);
			}

			if (dirty[0] & /*cellHeight, margin*/ 4194816 && rect_x_value !== (rect_x_value = /*cellHeight*/ ctx[22] * /*x*/ ctx[65] + /*margin*/ ctx[9])) {
				attr(rect, "x", rect_x_value);
			}

			if (dirty[0] & /*cellWidth*/ 262144) {
				attr(rect, "width", /*cellWidth*/ ctx[18]);
			}

			if (dirty[0] & /*cellHeight*/ 4194304) {
				attr(rect, "height", /*cellHeight*/ ctx[22]);
			}

			if (dirty[0] & /*innerBorderColour*/ 2048) {
				attr(rect, "stroke", /*innerBorderColour*/ ctx[11]);
			}

			if (dirty[0] & /*innerBorderWidth*/ 256) {
				attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			}

			if (dirty[0] & /*backgroundColour*/ 8192) {
				attr(rect, "fill", /*backgroundColour*/ ctx[13]);
			}

			if (dirty[0] & /*grid*/ 1 && t_value !== (t_value = /*letter*/ ctx[63] + "")) set_data(t, t_value);

			if (dirty[0] & /*cellWidth, margin*/ 262656 && text_1_x_value !== (text_1_x_value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2)) {
				attr(text_1, "x", text_1_x_value);
			}

			if (dirty[0] & /*cellHeight, margin*/ 4194816 && text_1_y_value !== (text_1_y_value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*cellHeight*/ ctx[22] - /*cellHeight*/ ctx[22] * 0.1)) {
				attr(text_1, "y", text_1_y_value);
			}

			if (dirty[0] & /*fontSize*/ 1048576) {
				attr(text_1, "font-size", /*fontSize*/ ctx[20]);
			}

			if (dirty[0] & /*cellWidth*/ 262144) {
				attr(text_1, "width", /*cellWidth*/ ctx[18]);
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

// (462:28) {#if letter=="#"}
function create_if_block_1(ctx) {
	let rect;
	let rect_y_value;
	let rect_x_value;
	let line0;
	let line0_y__value;
	let line0_x__value;
	let line0_y__value_1;
	let line0_x__value_1;
	let line1;
	let line1_y__value;
	let line1_x__value;
	let line1_y__value_1;
	let line1_x__value_1;
	let line1_transform_value;
	let mounted;
	let dispose;

	return {
		c() {
			rect = svg_element("rect");
			line0 = svg_element("line");
			line1 = svg_element("line");
			attr(rect, "class", "jxword-cell-rect svelte-1013j5m");
			attr(rect, "role", "cell");
			attr(rect, "tabindex", "-1");
			attr(rect, "aria-label", "blank");
			attr(rect, "y", rect_y_value = /*cellWidth*/ ctx[18] * /*y*/ ctx[62] + /*margin*/ ctx[9]);
			attr(rect, "x", rect_x_value = /*cellHeight*/ ctx[22] * /*x*/ ctx[65] + /*margin*/ ctx[9]);
			attr(rect, "width", /*cellWidth*/ ctx[18]);
			attr(rect, "height", /*cellHeight*/ ctx[22]);
			attr(rect, "stroke", /*innerBorderColour*/ ctx[11]);
			attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			attr(rect, "fill", /*fillColour*/ ctx[12]);
			attr(rect, "data-col", /*y*/ ctx[62]);
			attr(rect, "data-row", /*x*/ ctx[65]);
			attr(line0, "class", "jxword-cell-line jxword-no-print svelte-1013j5m");
			attr(line0, "role", "cell");
			attr(line0, "tabindex", "-1");
			attr(line0, "y1", line0_y__value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8]);
			attr(line0, "x1", line0_x__value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8]);
			attr(line0, "y2", line0_y__value_1 = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellHeight*/ ctx[22]);
			attr(line0, "x2", line0_x__value_1 = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellWidth*/ ctx[18]);
			attr(line0, "stroke", /*innerBorderColour*/ ctx[11]);
			attr(line0, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			attr(line0, "data-col", /*y*/ ctx[62]);
			attr(line0, "data-row", /*x*/ ctx[65]);
			attr(line1, "class", "jxword-no-print jxword-cell-line svelte-1013j5m");
			attr(line1, "role", "cell");
			attr(line1, "tabindex", "-1");
			attr(line1, "y1", line1_y__value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8]);
			attr(line1, "x1", line1_x__value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8]);
			attr(line1, "y2", line1_y__value_1 = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellHeight*/ ctx[22]);
			attr(line1, "x2", line1_x__value_1 = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellWidth*/ ctx[18]);
			attr(line1, "stroke", /*innerBorderColour*/ ctx[11]);
			attr(line1, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			attr(line1, "data-col", /*y*/ ctx[62]);
			attr(line1, "data-row", /*x*/ ctx[65]);
			attr(line1, "transform", line1_transform_value = "rotate(90, " + (/*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2) + ", " + (/*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2) + ")");
		},
		m(target, anchor) {
			insert(target, rect, anchor);
			insert(target, line0, anchor);
			insert(target, line1, anchor);

			if (!mounted) {
				dispose = [
					listen(rect, "focus", /*handleFocus*/ ctx[26]),
					listen(line0, "focus", /*handleFocus*/ ctx[26]),
					listen(line1, "focus", /*handleFocus*/ ctx[26])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cellWidth, margin*/ 262656 && rect_y_value !== (rect_y_value = /*cellWidth*/ ctx[18] * /*y*/ ctx[62] + /*margin*/ ctx[9])) {
				attr(rect, "y", rect_y_value);
			}

			if (dirty[0] & /*cellHeight, margin*/ 4194816 && rect_x_value !== (rect_x_value = /*cellHeight*/ ctx[22] * /*x*/ ctx[65] + /*margin*/ ctx[9])) {
				attr(rect, "x", rect_x_value);
			}

			if (dirty[0] & /*cellWidth*/ 262144) {
				attr(rect, "width", /*cellWidth*/ ctx[18]);
			}

			if (dirty[0] & /*cellHeight*/ 4194304) {
				attr(rect, "height", /*cellHeight*/ ctx[22]);
			}

			if (dirty[0] & /*innerBorderColour*/ 2048) {
				attr(rect, "stroke", /*innerBorderColour*/ ctx[11]);
			}

			if (dirty[0] & /*innerBorderWidth*/ 256) {
				attr(rect, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			}

			if (dirty[0] & /*fillColour*/ 4096) {
				attr(rect, "fill", /*fillColour*/ ctx[12]);
			}

			if (dirty[0] & /*cellHeight, margin, innerBorderWidth*/ 4195072 && line0_y__value !== (line0_y__value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8])) {
				attr(line0, "y1", line0_y__value);
			}

			if (dirty[0] & /*cellWidth, margin, innerBorderWidth*/ 262912 && line0_x__value !== (line0_x__value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8])) {
				attr(line0, "x1", line0_x__value);
			}

			if (dirty[0] & /*cellHeight, innerBorderWidth*/ 4194560 && line0_y__value_1 !== (line0_y__value_1 = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellHeight*/ ctx[22])) {
				attr(line0, "y2", line0_y__value_1);
			}

			if (dirty[0] & /*cellWidth, innerBorderWidth*/ 262400 && line0_x__value_1 !== (line0_x__value_1 = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellWidth*/ ctx[18])) {
				attr(line0, "x2", line0_x__value_1);
			}

			if (dirty[0] & /*innerBorderColour*/ 2048) {
				attr(line0, "stroke", /*innerBorderColour*/ ctx[11]);
			}

			if (dirty[0] & /*innerBorderWidth*/ 256) {
				attr(line0, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			}

			if (dirty[0] & /*cellHeight, margin, innerBorderWidth*/ 4195072 && line1_y__value !== (line1_y__value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8])) {
				attr(line1, "y1", line1_y__value);
			}

			if (dirty[0] & /*cellWidth, margin, innerBorderWidth*/ 262912 && line1_x__value !== (line1_x__value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*innerBorderWidth*/ ctx[8])) {
				attr(line1, "x1", line1_x__value);
			}

			if (dirty[0] & /*cellHeight, innerBorderWidth*/ 4194560 && line1_y__value_1 !== (line1_y__value_1 = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellHeight*/ ctx[22])) {
				attr(line1, "y2", line1_y__value_1);
			}

			if (dirty[0] & /*cellWidth, innerBorderWidth*/ 262400 && line1_x__value_1 !== (line1_x__value_1 = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*innerBorderWidth*/ ctx[8] * /*y*/ ctx[62] + /*cellWidth*/ ctx[18])) {
				attr(line1, "x2", line1_x__value_1);
			}

			if (dirty[0] & /*innerBorderColour*/ 2048) {
				attr(line1, "stroke", /*innerBorderColour*/ ctx[11]);
			}

			if (dirty[0] & /*innerBorderWidth*/ 256) {
				attr(line1, "stroke-width", /*innerBorderWidth*/ ctx[8]);
			}

			if (dirty[0] & /*cellWidth, margin, cellHeight*/ 4456960 && line1_transform_value !== (line1_transform_value = "rotate(90, " + (/*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2) + ", " + (/*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*cellWidth*/ ctx[18] / 2) + ")")) {
				attr(line1, "transform", line1_transform_value);
			}
		},
		d(detaching) {
			if (detaching) detach(rect);
			if (detaching) detach(line0);
			if (detaching) detach(line1);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (471:28) {#if (number_grid[y][x] != null && letter!=="#")}
function create_if_block(ctx) {
	let text_1;
	let t_value = /*number_grid*/ ctx[17][/*y*/ ctx[62]][/*x*/ ctx[65]] + "";
	let t;
	let text_1_x_value;
	let text_1_y_value;
	let mounted;
	let dispose;

	return {
		c() {
			text_1 = svg_element("text");
			t = text(t_value);
			attr(text_1, "x", text_1_x_value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + 2);
			attr(text_1, "y", text_1_y_value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*numFontSize*/ ctx[21]);
			attr(text_1, "text-anchor", "left");
			attr(text_1, "font-size", /*numFontSize*/ ctx[21]);
			attr(text_1, "class", "svelte-1013j5m");
		},
		m(target, anchor) {
			insert(target, text_1, anchor);
			append(text_1, t);

			if (!mounted) {
				dispose = listen(text_1, "focus", /*handleFocus*/ ctx[26]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*number_grid*/ 131072 && t_value !== (t_value = /*number_grid*/ ctx[17][/*y*/ ctx[62]][/*x*/ ctx[65]] + "")) set_data(t, t_value);

			if (dirty[0] & /*cellWidth, margin*/ 262656 && text_1_x_value !== (text_1_x_value = /*cellWidth*/ ctx[18] * /*x*/ ctx[65] + /*margin*/ ctx[9] + 2)) {
				attr(text_1, "x", text_1_x_value);
			}

			if (dirty[0] & /*cellHeight, margin, numFontSize*/ 6291968 && text_1_y_value !== (text_1_y_value = /*cellHeight*/ ctx[22] * /*y*/ ctx[62] + /*margin*/ ctx[9] + /*numFontSize*/ ctx[21])) {
				attr(text_1, "y", text_1_y_value);
			}

			if (dirty[0] & /*numFontSize*/ 2097152) {
				attr(text_1, "font-size", /*numFontSize*/ ctx[21]);
			}
		},
		d(detaching) {
			if (detaching) detach(text_1);
			mounted = false;
			dispose();
		}
	};
}

// (460:20) {#each col_data as letter, x}
function create_each_block_1$1(ctx) {
	let g;
	let if_block0_anchor;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*letter*/ ctx[63] == "#") return create_if_block_1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*number_grid*/ ctx[17][/*y*/ ctx[62]][/*x*/ ctx[65]] != null && /*letter*/ ctx[63] !== "#" && create_if_block(ctx);

	function click_handler() {
		return /*click_handler*/ ctx[44](/*x*/ ctx[65], /*y*/ ctx[62]);
	}

	function dblclick_handler() {
		return /*dblclick_handler*/ ctx[45](/*x*/ ctx[65], /*y*/ ctx[62]);
	}

	return {
		c() {
			g = svg_element("g");
			if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			attr(g, "id", "jxword-cell-" + /*x*/ ctx[65] + "-" + /*y*/ ctx[62]);
			attr(g, "class", "jxword-cell svelte-1013j5m");
			set_style(g, "z-index", "20");
			toggle_class(g, "selected", /*current_y*/ ctx[2] === /*y*/ ctx[62] && /*current_x*/ ctx[1] === /*x*/ ctx[65]);
			toggle_class(g, "active", /*marked_word_grid*/ ctx[19][/*y*/ ctx[62]][/*x*/ ctx[65]]);
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
					listen(g, "keydown", /*handleKeydown*/ ctx[16])
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

			if (/*number_grid*/ ctx[17][/*y*/ ctx[62]][/*x*/ ctx[65]] != null && /*letter*/ ctx[63] !== "#") {
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
				toggle_class(g, "selected", /*current_y*/ ctx[2] === /*y*/ ctx[62] && /*current_x*/ ctx[1] === /*x*/ ctx[65]);
			}

			if (dirty[0] & /*marked_word_grid*/ 524288) {
				toggle_class(g, "active", /*marked_word_grid*/ ctx[19][/*y*/ ctx[62]][/*x*/ ctx[65]]);
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

// (459:16) {#each grid as col_data, y}
function create_each_block$1(ctx) {
	let each_1_anchor;
	let each_value_1 = /*col_data*/ ctx[60];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
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
			if (dirty[0] & /*current_y, current_x, marked_word_grid, setCurrentPos, handleDoubleclick, handleKeydown, cellWidth, margin, cellHeight, numFontSize, handleFocus, number_grid, grid, innerBorderWidth, innerBorderColour, fillColour, fontSize, backgroundColour*/ 109034247) {
				each_value_1 = /*col_data*/ ctx[60];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1$1(child_ctx);
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

function create_fragment$4(ctx) {
	let main;
	let div;
	let input;
	let t0;
	let svg;
	let g;
	let rect;
	let t1;
	let questions;
	let current;
	let mounted;
	let dispose;
	let each_value = /*grid*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	questions = new Questions({});
	questions.$on("change", /*change_handler*/ ctx[47]);
	questions.$on("update_question", /*handleUpdateQuestion*/ ctx[27]);

	return {
		c() {
			main = element("main");
			div = element("div");
			input = element("input");
			t0 = space();
			svg = svg_element("svg");
			g = svg_element("g");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			rect = svg_element("rect");
			t1 = space();
			create_component(questions.$$.fragment);
			attr(input, "type", "text");
			attr(input, "class", "svelte-1013j5m");
			attr(rect, "x", /*margin*/ ctx[9]);
			attr(rect, "y", /*margin*/ ctx[9]);
			attr(rect, "width", /*totalWidth*/ ctx[5]);
			attr(rect, "height", /*totalHeight*/ ctx[6]);
			attr(rect, "stroke", /*outerBorderColour*/ ctx[10]);
			attr(rect, "stroke-width", /*outerBorderWidth*/ ctx[7]);
			attr(rect, "fill", "none");
			attr(rect, "class", "svelte-1013j5m");
			attr(g, "class", "cell-group svelte-1013j5m");
			attr(svg, "class", "jxword-svg svelte-1013j5m");
			attr(svg, "min-x", "0");
			attr(svg, "min-y", "0");
			attr(svg, "width", /*viewbox_width*/ ctx[23]);
			attr(svg, "height", /*viewbox_height*/ ctx[24]);
			attr(div, "class", "jxword-svg-container svelte-1013j5m");
			attr(main, "class", "svelte-1013j5m");
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, div);
			append(div, input);
			/*input_binding*/ ctx[43](input);
			append(div, t0);
			append(div, svg);
			append(svg, g);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(g, null);
			}

			append(g, rect);
			/*div_binding*/ ctx[46](div);
			append(main, t1);
			mount_component(questions, main, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "keydown", /*handleKeydown*/ ctx[16]),
					listen(rect, "focus", /*handleFocus*/ ctx[26]),
					listen(main, "move", /*handleMove*/ ctx[14])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*grid, current_y, current_x, marked_word_grid, setCurrentPos, handleDoubleclick, handleKeydown, cellWidth, margin, cellHeight, numFontSize, handleFocus, number_grid, innerBorderWidth, innerBorderColour, fillColour, fontSize, backgroundColour*/ 109034247) {
				each_value = /*grid*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(g, rect);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (!current || dirty[0] & /*margin*/ 512) {
				attr(rect, "x", /*margin*/ ctx[9]);
			}

			if (!current || dirty[0] & /*margin*/ 512) {
				attr(rect, "y", /*margin*/ ctx[9]);
			}

			if (!current || dirty[0] & /*totalWidth*/ 32) {
				attr(rect, "width", /*totalWidth*/ ctx[5]);
			}

			if (!current || dirty[0] & /*totalHeight*/ 64) {
				attr(rect, "height", /*totalHeight*/ ctx[6]);
			}

			if (!current || dirty[0] & /*outerBorderColour*/ 1024) {
				attr(rect, "stroke", /*outerBorderColour*/ ctx[10]);
			}

			if (!current || dirty[0] & /*outerBorderWidth*/ 128) {
				attr(rect, "stroke-width", /*outerBorderWidth*/ ctx[7]);
			}

			if (!current || dirty[0] & /*viewbox_width*/ 8388608) {
				attr(svg, "width", /*viewbox_width*/ ctx[23]);
			}

			if (!current || dirty[0] & /*viewbox_height*/ 16777216) {
				attr(svg, "height", /*viewbox_height*/ ctx[24]);
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
			/*input_binding*/ ctx[43](null);
			destroy_each(each_blocks, detaching);
			/*div_binding*/ ctx[46](null);
			destroy_component(questions);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let $currentDirection;
	let $questionsDown;
	let $questionsAcross;
	component_subscribe($$self, currentDirection, $$value => $$invalidate(48, $currentDirection = $$value));
	component_subscribe($$self, questionsDown, $$value => $$invalidate(49, $questionsDown = $$value));
	component_subscribe($$self, questionsAcross, $$value => $$invalidate(50, $questionsAcross = $$value));
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
	let { Container } = $$props;
	let { Input } = $$props;
	let { grid = [] } = $$props;
	let { size = 10 } = $$props;
	let { current_x = 0 } = $$props;
	let { current_y = 0 } = $$props;
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
					return {
						...$questionsAcross[i],
						answer,
						num,
						x,
						y
					};
				}

				if ($questionsAcross[i].num === num && $questionsAcross[i].direction === direction) {
					return { ...$questionsAcross[i], answer, x, y };
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
					return { ...$questionsDown[i], answer, num, x, y };
				}

				if ($questionsDown[i].num === num && $questionsDown[i].direction === direction) {
					return set_store_value(questionsDown, $questionsDown[i] = { ...$questionsDown[i], answer, x, y }, $questionsDown);
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

	function getCurrentQuestion() {
		let { x, y } = getCurrentPos();
		let selected_question;

		let questions = $currentDirection === "across"
		? $questionsAcross
		: $questionsDown;

		if (!questions.length) return;

		if ($currentDirection === "across") {
			selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);
		} else {
			selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);
		}

		return selected_question;
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
				word += grid[y][i] || " ";
			}
		} else {
			for (let i = start.y; i <= end.y; i++) {
				word += grid[i][x] || " ";
			}
		}

		return word;
	}

	function drawMarkedWordGrid() {
		$$invalidate(19, marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false)));

		if ($currentDirection === "across") {
			for (let x = current_x; x < size; x++) {
				if (!grid[current_y]) break;

				if (grid[current_y][x] === "#") {
					break;
				}

				$$invalidate(19, marked_word_grid[current_y][x] = true, marked_word_grid);
			}

			for (let x = current_x; x >= 0; x--) {
				if (!grid[current_y]) break;

				if (grid[current_y][x] === "#") {
					break;
				}

				$$invalidate(19, marked_word_grid[current_y][x] = true, marked_word_grid);
			}
		} else {
			// down
			for (let y = current_y; y < size; y++) {
				if (!grid[y]) break;

				if (grid[y][current_x] === "#") {
					break;
				}

				$$invalidate(19, marked_word_grid[y][current_x] = true, marked_word_grid);
			}

			for (let y = current_y; y >= 0; y--) {
				if (!grid[y]) break;

				if (grid[y][current_x] === "#") {
					break;
				}

				$$invalidate(19, marked_word_grid[y][current_x] = true, marked_word_grid);
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
		} else {
			if (current_y > 0) {
				$$invalidate(2, current_y--, current_y);
				$$invalidate(1, current_x = size - 1);
				dispatch("change");
				drawMarkedWordGrid();
			}
		}
	}

	function moveRight() {
		if (current_x < size - 1) {
			$$invalidate(1, current_x++, current_x);
			dispatch("change");
			drawMarkedWordGrid();
		} else {
			if (current_y < size - 1) {
				$$invalidate(2, current_y++, current_y);
				$$invalidate(1, current_x = 0);
				dispatch("change");
				drawMarkedWordGrid();
			}
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

	function moveStartOfCol() {
		$$invalidate(2, current_y = 0);
		dispatch("change");
		drawMarkedWordGrid();
	}

	function moveEndOfCol() {
		$$invalidate(2, current_y = size - 1);
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
		if ($currentDirection === "across") {
			currentDirection.set("down");
		} else {
			currentDirection.set("across");
		}

		// Find the current question
		const current_question = getCurrentQuestion();

		// console.log(current_question);
		currentQuestion.set(current_question);

		dispatch("change");
		drawMarkedWordGrid();
	}

	function setDir(direction) {
		if (direction === "across") {
			currentDirection.set("across");
		} else {
			currentDirection.set("down");
		}

		dispatch("change");
		drawMarkedWordGrid();
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
	// let questions = $currentDirection === "across" ? $questionsAcross : $questionsDown;

	function handleKeydown(e) {
		e.preventDefault();
		const keycode = e.keyCode;
		if (e.metaKey) return;

		if (keycode > 64 && keycode < 91) {
			dispatch("letter", e.key.toUpperCase());
		} else if (keycode === 51) {
			// #
			dispatch("letter", "#");
		} else if (keycode === 8) {
			// Backspace
			dispatch("backspace");
		} else if (keycode == 32) {
			// Space
			dispatch("letter", " ");
		} else if (keycode === 9) {
			// Enter
			if (e.shiftKey) {
				dispatch("move", "prev-word");
			} else {
				dispatch("move", "next-word");
			}
		} else if (keycode === 13) {
			// Enter
			dispatch("enter");
		} else if (keycode === 37) {
			dispatch("move", "left");
		} else if (keycode === 38) {
			dispatch("move", "up");
		} else if (keycode === 39) {
			dispatch("move", "right");
		} else if (keycode === 40) {
			dispatch("move", "down");
		}

		handleFocus();
	}

	function handleFocus(e) {
		Input.focus();
	}

	function handleUpdateQuestion(e) {
		const { question, suggestion } = e.detail;
		console.log(question, suggestion);

		if (question.direction === "across") {
			for (let i = 0; i < suggestion.length; i++) {
				$$invalidate(0, grid[question.y][i + question.x] = suggestion[i], grid);
			}
		} else {
			for (let i = 0; i < suggestion.length; i++) {
				$$invalidate(0, grid[i + question.y][question.x] = suggestion[i], grid);
			}
		}
	}

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			Input = $$value;
			$$invalidate(4, Input);
		});
	}

	const click_handler = (x, y) => {
		setCurrentPos(x, y);
	};

	const dblclick_handler = (x, y) => {
		handleDoubleclick();
	};

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			Container = $$value;
			$$invalidate(3, Container);
		});
	}

	function change_handler(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('Container' in $$props) $$invalidate(3, Container = $$props.Container);
		if ('Input' in $$props) $$invalidate(4, Input = $$props.Input);
		if ('grid' in $$props) $$invalidate(0, grid = $$props.grid);
		if ('size' in $$props) $$invalidate(28, size = $$props.size);
		if ('current_x' in $$props) $$invalidate(1, current_x = $$props.current_x);
		if ('current_y' in $$props) $$invalidate(2, current_y = $$props.current_y);
		if ('totalWidth' in $$props) $$invalidate(5, totalWidth = $$props.totalWidth);
		if ('totalHeight' in $$props) $$invalidate(6, totalHeight = $$props.totalHeight);
		if ('outerBorderWidth' in $$props) $$invalidate(7, outerBorderWidth = $$props.outerBorderWidth);
		if ('innerBorderWidth' in $$props) $$invalidate(8, innerBorderWidth = $$props.innerBorderWidth);
		if ('margin' in $$props) $$invalidate(9, margin = $$props.margin);
		if ('outerBorderColour' in $$props) $$invalidate(10, outerBorderColour = $$props.outerBorderColour);
		if ('innerBorderColour' in $$props) $$invalidate(11, innerBorderColour = $$props.innerBorderColour);
		if ('fillColour' in $$props) $$invalidate(12, fillColour = $$props.fillColour);
		if ('backgroundColour' in $$props) $$invalidate(13, backgroundColour = $$props.backgroundColour);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*size, totalWidth, margin, outerBorderWidth, totalHeight, cellWidth, grid, number_grid, current_x, current_y*/ 268829415) {
			{
				if (size < 2) {
					$$invalidate(28, size = 2);
				}

				if (size > 30) {
					$$invalidate(28, size = 30);
				}

				$$invalidate(23, viewbox_width = totalWidth + margin + outerBorderWidth);
				$$invalidate(24, viewbox_height = totalHeight + margin + outerBorderWidth);
				$$invalidate(18, cellWidth = totalWidth / size);
				$$invalidate(22, cellHeight = totalHeight / size);
				$$invalidate(20, fontSize = cellWidth * fontRatio);
				$$invalidate(21, numFontSize = cellWidth * numRatio);
				let questions_across = [];
				let questions_down = [];
				let num = 1;

				// Grow grid if necessary
				if (grid.length - 1 < size) {
					for (let i = 0; i < size; i++) {
						$$invalidate(0, grid[i] = grid[i] || Array(size).map(() => " "), grid);
						$$invalidate(17, number_grid[i] = number_grid[i] || Array(size).map(() => " "), number_grid);
					}
				}

				// Shrink grid if necessary
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

				// Make sure we're still in the grid
				if (current_x >= size) {
					$$invalidate(1, current_x = size - 1);
				}

				if (current_y >= size) {
					$$invalidate(2, current_y = size - 1);
				}

				for (let y = 0; y < size; y++) {
					if (!number_grid[y]) {
						$$invalidate(17, number_grid[y] = Array(size), number_grid);
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
							$$invalidate(17, number_grid[y][x] = null, number_grid);
						} else {
							$$invalidate(17, number_grid[y][x] = num++, number_grid);
						}
					}
				}

				// questions_across.sort();
				// questions_down.sort();
				questionsAcross.set(questions_across);

				questionsDown.set(questions_down);

				// Find the current question
				const current_question = getCurrentQuestion();

				// console.log(current_question);
				currentQuestion.set(current_question);

				drawMarkedWordGrid();
			}
		}
	};

	return [
		grid,
		current_x,
		current_y,
		Container,
		Input,
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
		handleFocus,
		handleUpdateQuestion,
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
		moveStartOfCol,
		moveEndOfCol,
		toggleDir,
		setDir,
		getCurrentPos,
		input_binding,
		click_handler,
		dblclick_handler,
		div_binding,
		change_handler
	];
}

class Grid extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$4,
			create_fragment$4,
			safe_not_equal,
			{
				Container: 3,
				Input: 4,
				grid: 0,
				size: 28,
				current_x: 1,
				current_y: 2,
				totalWidth: 5,
				totalHeight: 6,
				outerBorderWidth: 7,
				innerBorderWidth: 8,
				margin: 9,
				outerBorderColour: 10,
				innerBorderColour: 11,
				fillColour: 12,
				backgroundColour: 13,
				fontRatio: 29,
				numRatio: 30,
				selectCell: 31,
				moveUp: 32,
				moveDown: 33,
				moveLeft: 34,
				moveRight: 35,
				moveStartOfRow: 36,
				moveEndOfRow: 37,
				moveStartOfCol: 38,
				moveEndOfCol: 39,
				handleMove: 14,
				toggleDir: 40,
				setDir: 41,
				getCurrentPos: 42,
				setCurrentPos: 15,
				handleKeydown: 16
			},
			null,
			[-1, -1, -1]
		);
	}

	get fontRatio() {
		return this.$$.ctx[29];
	}

	get numRatio() {
		return this.$$.ctx[30];
	}

	get selectCell() {
		return this.$$.ctx[31];
	}

	get moveUp() {
		return this.$$.ctx[32];
	}

	get moveDown() {
		return this.$$.ctx[33];
	}

	get moveLeft() {
		return this.$$.ctx[34];
	}

	get moveRight() {
		return this.$$.ctx[35];
	}

	get moveStartOfRow() {
		return this.$$.ctx[36];
	}

	get moveEndOfRow() {
		return this.$$.ctx[37];
	}

	get moveStartOfCol() {
		return this.$$.ctx[38];
	}

	get moveEndOfCol() {
		return this.$$.ctx[39];
	}

	get handleMove() {
		return this.$$.ctx[14];
	}

	get toggleDir() {
		return this.$$.ctx[40];
	}

	get setDir() {
		return this.$$.ctx[41];
	}

	get getCurrentPos() {
		return this.$$.ctx[42];
	}

	get setCurrentPos() {
		return this.$$.ctx[15];
	}

	get handleKeydown() {
		return this.$$.ctx[16];
	}
}

/* src/Instructions.svelte generated by Svelte v3.46.4 */

function create_fragment$3(ctx) {
	let main;
	let div;
	let t1;
	let h2;
	let t3;
	let p0;
	let t5;
	let p1;
	let t7;
	let p2;
	let t9;
	let p3;
	let t11;
	let p4;
	let t13;
	let p5;
	let mounted;
	let dispose;

	return {
		c() {
			main = element("main");
			div = element("div");
			div.textContent = "×";
			t1 = space();
			h2 = element("h2");
			h2.textContent = "Instructions";
			t3 = space();
			p0 = element("p");
			p0.textContent = "Use \"#\" to create a blank square.";
			t5 = space();
			p1 = element("p");
			p1.textContent = "Hit Enter or double-click the question on the right to set an answer.";
			t7 = space();
			p2 = element("p");
			p2.textContent = "Use Space to change directions.";
			t9 = space();
			p3 = element("p");
			p3.textContent = "Use arrow keys to navigate.";
			t11 = space();
			p4 = element("p");
			p4.textContent = "Hint: Complete the words before starting on the answers, because you might have to change something!";
			t13 = space();
			p5 = element("p");
			p5.innerHTML = `Note: This Crossword Creator is in Alpha. <a href="https://github.com/j-norwood-young/jxword-creator/issues">Please report bugs here</a>.`;
			attr(div, "class", "close svelte-n4k5p1");
			attr(main, "class", "svelte-n4k5p1");
			toggle_class(main, "visible", /*visible*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, div);
			append(main, t1);
			append(main, h2);
			append(main, t3);
			append(main, p0);
			append(main, t5);
			append(main, p1);
			append(main, t7);
			append(main, p2);
			append(main, t9);
			append(main, p3);
			append(main, t11);
			append(main, p4);
			append(main, t13);
			append(main, p5);

			if (!mounted) {
				dispose = listen(div, "click", /*hideInstructions*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*visible*/ 1) {
				toggle_class(main, "visible", /*visible*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(main);
			mounted = false;
			dispose();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { visible = false } = $$props;

	function hideInstructions() {
		$$invalidate(0, visible = false);
	}

	$$self.$$set = $$props => {
		if ('visible' in $$props) $$invalidate(0, visible = $$props.visible);
	};

	return [visible, hideInstructions];
}

class Instructions extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { visible: 0 });
	}
}

/* src/SizeSlider.svelte generated by Svelte v3.46.4 */

function create_fragment$2(ctx) {
	let main;
	let input;
	let t0;
	let label;
	let t1_value = `${/*findSize*/ ctx[1](/*size*/ ctx[0]).name} ${/*size*/ ctx[0]}x${/*size*/ ctx[0]}` + "";
	let t1;
	let mounted;
	let dispose;

	return {
		c() {
			main = element("main");
			input = element("input");
			t0 = space();
			label = element("label");
			t1 = text(t1_value);
			attr(input, "name", "size");
			attr(input, "type", "range");
			attr(input, "min", "2");
			attr(input, "max", "30");
			attr(input, "class", "svelte-1ngozab");
			attr(label, "for", "size");
			attr(main, "class", "svelte-1ngozab");
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, input);
			set_input_value(input, /*size*/ ctx[0]);
			append(main, t0);
			append(main, label);
			append(label, t1);

			if (!mounted) {
				dispose = [
					listen(input, "change", /*input_change_input_handler*/ ctx[3]),
					listen(input, "input", /*input_change_input_handler*/ ctx[3]),
					listen(input, "change", /*handleStateChange*/ ctx[2])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				set_input_value(input, /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1 && t1_value !== (t1_value = `${/*findSize*/ ctx[1](/*size*/ ctx[0]).name} ${/*size*/ ctx[0]}x${/*size*/ ctx[0]}` + "")) set_data(t1, t1_value);
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

function instance$2($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();

	// Sizes
	const sizes = [
		{ name: "Mini", size: 5, min: 2, max: 5 },
		{ name: "Small", size: 7, min: 6, max: 10 },
		{
			name: "Weekday",
			size: 15,
			min: 11,
			max: 20
		},
		{
			name: "Large",
			size: 23,
			min: 21,
			max: 26
		},
		{
			name: "XLarge",
			size: 27,
			min: 27,
			max: 30
		}
	];

	let { size } = $$props;
	findSize(size);

	function findSize(size) {
		return sizes.find(s => size >= s.min && size <= s.max);
	}

	function handleStateChange() {
		findSize(size);
		dispatch("change");
	}

	function input_change_input_handler() {
		size = to_number(this.value);
		$$invalidate(0, size);
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
	};

	return [size, findSize, handleStateChange, input_change_input_handler];
}

class SizeSlider extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { size: 0 });
	}
}

/* src/Print.svelte generated by Svelte v3.46.4 */

function create_fragment$1(ctx) {
	let main;
	let button0;
	let t1;
	let button1;
	let mounted;
	let dispose;

	return {
		c() {
			main = element("main");
			button0 = element("button");
			button0.textContent = "Print (Filled)";
			t1 = space();
			button1 = element("button");
			button1.textContent = "Print (Blank)";
			attr(button0, "class", "jxword-button");
			attr(button1, "class", "jxword-button");
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, button0);
			append(main, t1);
			append(main, button1);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*printFilled*/ ctx[1]),
					listen(button1, "click", /*printBlank*/ ctx[0])
				];

				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(main);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $questionsAcross;
	let $questionsDown;
	component_subscribe($$self, questionsAcross, $$value => $$invalidate(3, $questionsAcross = $$value));
	component_subscribe($$self, questionsDown, $$value => $$invalidate(4, $questionsDown = $$value));
	let { state } = $$props;

	function printBlank() {
		const svg = document.querySelector(`.jxword-svg`).cloneNode(true);

		const remove_els = [
			...svg.querySelectorAll(`.jxword-no-print-blank`),
			...svg.querySelectorAll(`.jxword-no-print`)
		];

		for (let remove_el of remove_els) {
			remove_el.remove();
		}

		print(svg);
	}

	function printFilled() {
		const svg = document.querySelector(`.jxword-svg`).cloneNode(true);
		const remove_els = [...svg.querySelectorAll(`.jxword-no-print`)];

		for (let remove_el of remove_els) {
			remove_el.remove();
		}

		print(svg);
	}

	function formatQuestions(direction) {
		let questions;

		if (direction === "down") {
			questions = $questionsDown;
		} else {
			questions = $questionsAcross;
		}

		return questions.map(question => `<li>${question.num}: ${question.question}</li>`).join("");
	}

	function print(svg) {
		// console.log(svg);
		const svg_text = svg.outerHTML.replace(/fill="#f7f457"/g, `fill="#ffffff"`).replace(/fill="#9ce0fb"/g, `fill="#ffffff"`);

		const questions_across = `<h4>Across</h4><ol class="jxword-questions-list">${formatQuestions("across")}</ol>`;
		const questions_down = `<h4>Down</h4><ol class="jxword-questions-list">${formatQuestions("down")}</ol>`;
		let printWindow = window.open();
		printWindow.document.write(`<html><head><title>${state.title}</title>`);

		printWindow.document.write(`<style>.svg-container {
  height: 35em;
  display: block;
}

.jxword-svg {
  height: 100%;
  width: 100%;
}

.jxword-questions-list {
  list-style: none;
  line-height: 1.5;
  font-size: 12px;
  padding-left: 0px;
  display: flex;
  flex-direction: column;
  margin-right: 20px;
}

.jxword-questions-list-item-num {
  margin-right: 5px;
  text-align: right;
  width: 25px;
  min-width: 25px;
  font-weight: bold;
}

.questions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}</style>`);

		printWindow.document.write(`<div class="svg-container">${svg_text}</div>`);
		printWindow.document.write(`<div class="questions">\n`);
		printWindow.document.write(`<div>${questions_across}</div>`);
		printWindow.document.write(`<div>${questions_down}</div>`);
		printWindow.document.write(`</div>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
		printWindow.close();
	}

	$$self.$$set = $$props => {
		if ('state' in $$props) $$invalidate(2, state = $$props.state);
	};

	return [printBlank, printFilled, state];
}

class Print extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { state: 2 });
	}
}

function saveState(state) {
    let stateString = JSON.stringify(state);
    localStorage.setItem('jxword-creator', stateString);
}

function restoreState() {
    let stateString = localStorage.getItem('jxword-creator');
    if (stateString && stateString !== 'undefined') {
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
    if (!obj) return;
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
    if (obj.difficulty) {
        str += `Difficulty: ${obj.difficulty}\n`;
    }
    if (obj.type) {
        str += `Type: ${obj.type}\n`;
    }
    if (obj.copyright) {
        str += `Copyright: ${obj.copyright}\n`;
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

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[49] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[52] = list[i];
	return child_ctx;
}

// (282:6) {#each difficulties as difficulty_option}
function create_each_block_1(ctx) {
	let option;
	let t_value = /*difficulty_option*/ ctx[52] + "";
	let t;
	let option_value_value;

	return {
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = /*difficulty_option*/ ctx[52];
			option.value = option.__value;
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*difficulties*/ 1024 && t_value !== (t_value = /*difficulty_option*/ ctx[52] + "")) set_data(t, t_value);

			if (dirty[0] & /*difficulties*/ 1024 && option_value_value !== (option_value_value = /*difficulty_option*/ ctx[52])) {
				option.__value = option_value_value;
				option.value = option.__value;
			}
		},
		d(detaching) {
			if (detaching) detach(option);
		}
	};
}

// (290:6) {#each types as type_option}
function create_each_block(ctx) {
	let option;
	let t_value = /*type_option*/ ctx[49] + "";
	let t;
	let option_value_value;

	return {
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = /*type_option*/ ctx[49];
			option.value = option.__value;
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*types*/ 2048 && t_value !== (t_value = /*type_option*/ ctx[49] + "")) set_data(t, t_value);

			if (dirty[0] & /*types*/ 2048 && option_value_value !== (option_value_value = /*type_option*/ ctx[49])) {
				option.__value = option_value_value;
				option.value = option.__value;
			}
		},
		d(detaching) {
			if (detaching) detach(option);
		}
	};
}

function create_fragment(ctx) {
	let main;
	let instructions;
	let updating_visible;
	let t0;
	let div10;
	let div7;
	let div2;
	let input0;
	let t1;
	let sizeslider;
	let updating_size;
	let t2;
	let div0;
	let label0;
	let t4;
	let select0;
	let t5;
	let div1;
	let label1;
	let t7;
	let select1;
	let t8;
	let input1;
	let t9;
	let input2;
	let t10;
	let input3;
	let t11;
	let input4;
	let t12;
	let div6;
	let div3;
	let input5;
	let t13;
	let label2;
	let t15;
	let print;
	let updating_state;
	let t16;
	let div4;
	let label3;
	let t18;
	let input6;
	let t19;
	let div5;
	let button;
	let t21;
	let div9;
	let div8;
	let menu;
	let t22;
	let grid_1;
	let updating_Container;
	let t23;
	let textarea;
	let current;
	let mounted;
	let dispose;

	function instructions_visible_binding(value) {
		/*instructions_visible_binding*/ ctx[29](value);
	}

	let instructions_props = {};

	if (/*instructionsVisible*/ ctx[18] !== void 0) {
		instructions_props.visible = /*instructionsVisible*/ ctx[18];
	}

	instructions = new Instructions({ props: instructions_props });
	binding_callbacks.push(() => bind(instructions, 'visible', instructions_visible_binding));

	function sizeslider_size_binding(value) {
		/*sizeslider_size_binding*/ ctx[31](value);
	}

	let sizeslider_props = {};

	if (/*size*/ ctx[15] !== void 0) {
		sizeslider_props.size = /*size*/ ctx[15];
	}

	sizeslider = new SizeSlider({ props: sizeslider_props });
	binding_callbacks.push(() => bind(sizeslider, 'size', sizeslider_size_binding));
	sizeslider.$on("change", /*handleStateChange*/ ctx[23]);
	let each_value_1 = /*difficulties*/ ctx[10];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*types*/ ctx[11];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	function print_state_binding(value) {
		/*print_state_binding*/ ctx[39](value);
	}

	let print_props = {};

	if (/*state*/ ctx[16] !== void 0) {
		print_props.state = /*state*/ ctx[16];
	}

	print = new Print({ props: print_props });
	binding_callbacks.push(() => bind(print, 'state', print_state_binding));
	menu = new Menu({});
	menu.$on("reset", /*handleReset*/ ctx[24]);
	menu.$on("instructions", /*handleInstructions*/ ctx[26]);

	function grid_1_Container_binding(value) {
		/*grid_1_Container_binding*/ ctx[42](value);
	}

	let grid_1_props = {
		size: /*size*/ ctx[15],
		grid: /*grid*/ ctx[1]
	};

	if (/*gridComponentContainer*/ ctx[14] !== void 0) {
		grid_1_props.Container = /*gridComponentContainer*/ ctx[14];
	}

	grid_1 = new Grid({ props: grid_1_props });
	/*grid_1_binding*/ ctx[41](grid_1);
	binding_callbacks.push(() => bind(grid_1, 'Container', grid_1_Container_binding));
	grid_1.$on("change", /*handleStateChange*/ ctx[23]);
	grid_1.$on("move", /*handleMove*/ ctx[19]);
	grid_1.$on("letter", /*handleLetter*/ ctx[20]);
	grid_1.$on("backspace", /*handleBackspace*/ ctx[22]);
	grid_1.$on("enter", /*handleEnter*/ ctx[21]);

	return {
		c() {
			main = element("main");
			create_component(instructions.$$.fragment);
			t0 = space();
			div10 = element("div");
			div7 = element("div");
			div2 = element("div");
			input0 = element("input");
			t1 = space();
			create_component(sizeslider.$$.fragment);
			t2 = space();
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Difficulty";
			t4 = space();
			select0 = element("select");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			div1 = element("div");
			label1 = element("label");
			label1.textContent = "Type";
			t7 = space();
			select1 = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t8 = space();
			input1 = element("input");
			t9 = space();
			input2 = element("input");
			t10 = space();
			input3 = element("input");
			t11 = space();
			input4 = element("input");
			t12 = space();
			div6 = element("div");
			div3 = element("div");
			input5 = element("input");
			t13 = space();
			label2 = element("label");
			label2.textContent = "Symmetry";
			t15 = space();
			create_component(print.$$.fragment);
			t16 = space();
			div4 = element("div");
			label3 = element("label");
			label3.textContent = "Upload Crossword";
			t18 = space();
			input6 = element("input");
			t19 = space();
			div5 = element("div");
			button = element("button");
			button.textContent = "Download Crossword";
			t21 = space();
			div9 = element("div");
			div8 = element("div");
			create_component(menu.$$.fragment);
			t22 = space();
			create_component(grid_1.$$.fragment);
			t23 = space();
			textarea = element("textarea");
			attr(input0, "id", "jxword-title");
			attr(input0, "class", "jxword-title svelte-28r245");
			attr(input0, "name", "title");
			attr(input0, "type", "text");
			attr(input0, "placeholder", "Title");
			attr(label0, "for", "difficulty");
			attr(label0, "class", "svelte-28r245");
			attr(select0, "id", "jxword-difficulty");
			attr(select0, "name", "difficulty");
			attr(select0, "class", "svelte-28r245");
			if (/*difficulty*/ ctx[7] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[32].call(select0));
			attr(label1, "for", "type");
			attr(label1, "class", "svelte-28r245");
			attr(select1, "id", "jxword-type");
			attr(select1, "name", "type");
			attr(select1, "class", "svelte-28r245");
			if (/*type*/ ctx[8] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[33].call(select1));
			attr(input1, "id", "jxword-date");
			attr(input1, "name", "date");
			attr(input1, "type", "date");
			attr(input1, "placeholder", "Publish Date");
			attr(input1, "class", "svelte-28r245");
			attr(input2, "id", "jxword-author");
			attr(input2, "name", "author");
			attr(input2, "type", "text");
			attr(input2, "placeholder", "Author");
			attr(input2, "class", "svelte-28r245");
			attr(input3, "id", "jxword-editor");
			attr(input3, "name", "editor");
			attr(input3, "type", "text");
			attr(input3, "placeholder", "Editor");
			attr(input3, "class", "svelte-28r245");
			attr(input4, "id", "jxword-copyright");
			attr(input4, "name", "copyright");
			attr(input4, "type", "text");
			attr(input4, "placeholder", "Copyright");
			attr(input4, "class", "svelte-28r245");
			attr(div2, "id", "jxword-meta");
			attr(input5, "type", "checkbox");
			attr(input5, "name", "symmetry");
			attr(input5, "class", "svelte-28r245");
			attr(label2, "for", "symmetry");
			attr(label2, "class", "svelte-28r245");
			attr(div3, "class", "jxword-checkbox-group svelte-28r245");
			attr(label3, "for", "file");
			attr(label3, "class", "svelte-28r245");
			attr(input6, "class", "drop_zone svelte-28r245");
			attr(input6, "type", "file");
			attr(input6, "id", "file");
			attr(input6, "name", "files");
			attr(input6, "accept", ".xd");
			attr(div6, "id", "jxword-options");
			attr(div6, "class", "svelte-28r245");
			attr(div7, "id", "jxword-top");
			attr(div7, "class", "svelte-28r245");
			attr(div8, "class", "jxword-header");
			attr(div9, "class", "jxword-container svelte-28r245");
			attr(textarea, "id", "xd");
			attr(textarea, "name", "xd");
			attr(textarea, "class", "jxword-xd-textarea svelte-28r245");
			set_style(textarea, "display", /*displayXd*/ ctx[12] ? 'block' : 'none', false);
			attr(div10, "class", "jxword-form-container svelte-28r245");
			attr(main, "class", "svelte-28r245");
		},
		m(target, anchor) {
			insert(target, main, anchor);
			mount_component(instructions, main, null);
			append(main, t0);
			append(main, div10);
			append(div10, div7);
			append(div7, div2);
			append(div2, input0);
			set_input_value(input0, /*title*/ ctx[2]);
			append(div2, t1);
			mount_component(sizeslider, div2, null);
			append(div2, t2);
			append(div2, div0);
			append(div0, label0);
			append(div0, t4);
			append(div0, select0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(select0, null);
			}

			select_option(select0, /*difficulty*/ ctx[7]);
			append(div2, t5);
			append(div2, div1);
			append(div1, label1);
			append(div1, t7);
			append(div1, select1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select1, null);
			}

			select_option(select1, /*type*/ ctx[8]);
			append(div2, t8);
			append(div2, input1);
			set_input_value(input1, /*date*/ ctx[6]);
			append(div2, t9);
			append(div2, input2);
			set_input_value(input2, /*author*/ ctx[3]);
			append(div2, t10);
			append(div2, input3);
			set_input_value(input3, /*editor*/ ctx[4]);
			append(div2, t11);
			append(div2, input4);
			set_input_value(input4, /*copyright*/ ctx[5]);
			append(div7, t12);
			append(div7, div6);
			append(div6, div3);
			append(div3, input5);
			input5.checked = /*symmetry*/ ctx[9];
			append(div3, t13);
			append(div3, label2);
			append(div6, t15);
			mount_component(print, div6, null);
			append(div6, t16);
			append(div6, div4);
			append(div4, label3);
			append(div4, t18);
			append(div4, input6);
			/*input6_binding*/ ctx[40](input6);
			append(div6, t19);
			append(div6, div5);
			append(div5, button);
			append(div10, t21);
			append(div10, div9);
			append(div9, div8);
			mount_component(menu, div8, null);
			append(div9, t22);
			mount_component(grid_1, div9, null);
			append(div10, t23);
			append(div10, textarea);
			set_input_value(textarea, /*xd*/ ctx[0]);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input0, "input", /*input0_input_handler*/ ctx[30]),
					listen(input0, "change", /*handleStateChange*/ ctx[23]),
					listen(select0, "change", /*select0_change_handler*/ ctx[32]),
					listen(select0, "change", /*handleStateChange*/ ctx[23]),
					listen(select1, "change", /*select1_change_handler*/ ctx[33]),
					listen(select1, "change", /*handleStateChange*/ ctx[23]),
					listen(input1, "input", /*input1_input_handler*/ ctx[34]),
					listen(input1, "change", /*handleStateChange*/ ctx[23]),
					listen(input2, "input", /*input2_input_handler*/ ctx[35]),
					listen(input2, "change", /*handleStateChange*/ ctx[23]),
					listen(input3, "input", /*input3_input_handler*/ ctx[36]),
					listen(input3, "change", /*handleStateChange*/ ctx[23]),
					listen(input4, "input", /*input4_input_handler*/ ctx[37]),
					listen(input4, "change", /*handleStateChange*/ ctx[23]),
					listen(input5, "change", /*input5_change_handler*/ ctx[38]),
					listen(input6, "change", /*handleFileSelect*/ ctx[25]),
					listen(button, "click", /*downloadXD*/ ctx[27]),
					listen(textarea, "input", /*textarea_input_handler*/ ctx[43])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			const instructions_changes = {};

			if (!updating_visible && dirty[0] & /*instructionsVisible*/ 262144) {
				updating_visible = true;
				instructions_changes.visible = /*instructionsVisible*/ ctx[18];
				add_flush_callback(() => updating_visible = false);
			}

			instructions.$set(instructions_changes);

			if (dirty[0] & /*title*/ 4 && input0.value !== /*title*/ ctx[2]) {
				set_input_value(input0, /*title*/ ctx[2]);
			}

			const sizeslider_changes = {};

			if (!updating_size && dirty[0] & /*size*/ 32768) {
				updating_size = true;
				sizeslider_changes.size = /*size*/ ctx[15];
				add_flush_callback(() => updating_size = false);
			}

			sizeslider.$set(sizeslider_changes);

			if (dirty[0] & /*difficulties*/ 1024) {
				each_value_1 = /*difficulties*/ ctx[10];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(select0, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty[0] & /*difficulty, difficulties*/ 1152) {
				select_option(select0, /*difficulty*/ ctx[7]);
			}

			if (dirty[0] & /*types*/ 2048) {
				each_value = /*types*/ ctx[11];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty[0] & /*type, types*/ 2304) {
				select_option(select1, /*type*/ ctx[8]);
			}

			if (dirty[0] & /*date*/ 64) {
				set_input_value(input1, /*date*/ ctx[6]);
			}

			if (dirty[0] & /*author*/ 8 && input2.value !== /*author*/ ctx[3]) {
				set_input_value(input2, /*author*/ ctx[3]);
			}

			if (dirty[0] & /*editor*/ 16 && input3.value !== /*editor*/ ctx[4]) {
				set_input_value(input3, /*editor*/ ctx[4]);
			}

			if (dirty[0] & /*copyright*/ 32 && input4.value !== /*copyright*/ ctx[5]) {
				set_input_value(input4, /*copyright*/ ctx[5]);
			}

			if (dirty[0] & /*symmetry*/ 512) {
				input5.checked = /*symmetry*/ ctx[9];
			}

			const print_changes = {};

			if (!updating_state && dirty[0] & /*state*/ 65536) {
				updating_state = true;
				print_changes.state = /*state*/ ctx[16];
				add_flush_callback(() => updating_state = false);
			}

			print.$set(print_changes);
			const grid_1_changes = {};
			if (dirty[0] & /*size*/ 32768) grid_1_changes.size = /*size*/ ctx[15];
			if (dirty[0] & /*grid*/ 2) grid_1_changes.grid = /*grid*/ ctx[1];

			if (!updating_Container && dirty[0] & /*gridComponentContainer*/ 16384) {
				updating_Container = true;
				grid_1_changes.Container = /*gridComponentContainer*/ ctx[14];
				add_flush_callback(() => updating_Container = false);
			}

			grid_1.$set(grid_1_changes);

			if (dirty[0] & /*xd*/ 1) {
				set_input_value(textarea, /*xd*/ ctx[0]);
			}

			if (dirty[0] & /*displayXd*/ 4096) {
				set_style(textarea, "display", /*displayXd*/ ctx[12] ? 'block' : 'none', false);
			}
		},
		i(local) {
			if (current) return;
			transition_in(instructions.$$.fragment, local);
			transition_in(sizeslider.$$.fragment, local);
			transition_in(print.$$.fragment, local);
			transition_in(menu.$$.fragment, local);
			transition_in(grid_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(instructions.$$.fragment, local);
			transition_out(sizeslider.$$.fragment, local);
			transition_out(print.$$.fragment, local);
			transition_out(menu.$$.fragment, local);
			transition_out(grid_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(main);
			destroy_component(instructions);
			destroy_component(sizeslider);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			destroy_component(print);
			/*input6_binding*/ ctx[40](null);
			destroy_component(menu);
			/*grid_1_binding*/ ctx[41](null);
			destroy_component(grid_1);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $questionsDown;
	let $questionsAcross;
	let $currentDirection;
	component_subscribe($$self, questionsDown, $$value => $$invalidate(44, $questionsDown = $$value));
	component_subscribe($$self, questionsAcross, $$value => $$invalidate(45, $questionsAcross = $$value));
	component_subscribe($$self, currentDirection, $$value => $$invalidate(46, $currentDirection = $$value));
	let { difficulties = ["Easy", "Medium", "Hard", "Evil"] } = $$props;
	let { types = ["Straight", "Quick", "Cryptic"] } = $$props;
	const save_state = true;
	let { xd } = $$props;
	let { grid = [...Array(15)].map(e => Array(15)) } = $$props;
	let { title } = $$props;
	let { author } = $$props;
	let { editor } = $$props;
	let { copyright } = $$props;
	let { date } = $$props;
	let { difficulty } = $$props;
	let { type } = $$props;
	let { displayXd = true } = $$props;
	let { symmetry = true } = $$props;

	// Private properties
	// let symmetry_id = $symmetries.findIndex(s => s.default);
	// State
	let gridComponent;

	let gridComponentContainer;
	let size = grid.length;

	let state = {
		grid,
		size,
		current_x: 0,
		current_y: 0,
		direction: "across",
		questions_across: $questionsAcross,
		questions_down: $questionsDown
	}; // symmetry_id,

	let getState = () => {
		if (!gridComponent) return; // We haven't loaded the grid yet
		let { x: current_x, y: current_y } = gridComponent.getCurrentPos();

		return {
			grid,
			size,
			current_x,
			current_y,
			direction: $currentDirection,
			questions_across: $questionsAcross,
			questions_down: $questionsDown,
			title,
			author,
			editor,
			copyright,
			difficulty,
			type,
			date
		}; // symmetry_id,
	};

	function handleMove(event) {
		const direction = event.detail;
		let newDir;

		if (direction === "down" || direction === "up") {
			newDir = "down";
		}

		if (direction === "left" || direction === "right") {
			newDir = "across";
		}

		if (newDir !== $currentDirection) {
			gridComponent.setDir(newDir);
		} else {
			gridComponent.handleMove(direction);
		}
	}

	function handleLetter(event) {
		event.preventDefault();
		const letter = event.detail;

		if (letter === " ") {
			gridComponent.toggleDir();
			return;
		}

		let { x, y } = gridComponent.getCurrentPos();
		$$invalidate(1, grid[y][x] = letter, grid);

		if (symmetry) {
			if (letter === "#") {
				$$invalidate(1, grid[size - y - 1][size - x - 1] = "#", grid);
			}
		}

		if ($currentDirection === "across") {
			gridComponent.moveRight();
		} else {
			gridComponent.moveDown();
		}
	}

	function handleEnter(event) {
		let { x, y } = gridComponent.getCurrentPos();
		let selected_question;

		let questions = $currentDirection === "across"
		? $questionsAcross
		: $questionsDown;

		if ($currentDirection === "across") {
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
		event.preventDefault();
		let { x, y } = gridComponent.getCurrentPos();
		const letter = grid[y][x];

		if (symmetry && letter === "#") {
			$$invalidate(1, grid[size - y - 1][size - x - 1] = "", grid);
		}

		$$invalidate(1, grid[y][x] = "", grid);

		if ($currentDirection === "across") {
			gridComponent.moveLeft();
		} else {
			gridComponent.moveUp();
		}
	}

	async function handleStateChange() {
		saveState(getState());
		$$invalidate(0, xd = XDEncode(getState()));
	}

	onMount(() => {
		if (xd) {
			loadXd(xd);
		} else {
			{
				$$invalidate(16, state = restoreState() || state);
			}

			$$invalidate(1, grid = state.grid);
			$$invalidate(15, size = state.size);
			$$invalidate(3, author = state.author);
			$$invalidate(4, editor = state.editor);
			$$invalidate(5, copyright = state.copyright);
			$$invalidate(6, date = state.date);
			$$invalidate(2, title = state.title);
			$$invalidate(7, difficulty = state.difficulty);
			$$invalidate(8, type = state.type);
			questionsAcross.set(state.questions_across);
			questionsDown.set(state.questions_down);
			gridComponent.setDir(state.direction);
			gridComponent.setCurrentPos(state.current_x, state.current_y);
		} // symmetry_id = state.symmetry_id;
	});

	function handleReset() {
		clearState();
		$$invalidate(15, size = 15);
		gridComponent.setDir("across");
		gridComponent.setCurrentPos(0, 0);
		$$invalidate(2, title = "");
		$$invalidate(3, author = "");
		$$invalidate(4, editor = "");
		$$invalidate(5, copyright = "");
		$$invalidate(6, date = "");
		$$invalidate(7, difficulty = "Medium");
		$$invalidate(8, type = "Straight");
		$$invalidate(1, grid = [...Array(15)].map(e => Array(15)));
		questionsAcross.set([]);
		clearState();
		questionsDown.set([]);
		clearState();
		$$invalidate(0, xd = "");
		clearState();
	}

	async function loadXd(xd) {
		const data = xdCrosswordParser(xd);
		$$invalidate(1, grid = data.grid);
		$$invalidate(15, size = data.grid.length);
		$$invalidate(3, author = data.meta.Author);
		$$invalidate(4, editor = data.meta.Editor);
		$$invalidate(5, copyright = data.meta.Copyright);
		$$invalidate(6, date = data.meta.Date);
		$$invalidate(2, title = data.meta.Title);
		$$invalidate(7, difficulty = data.meta.Difficulty);
		$$invalidate(8, type = data.meta.Type);
		gridComponent.setDir("across");
		gridComponent.setCurrentPos(0, 0);
		await tick();
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
	}

	let fileInput;

	function handleFileSelect() {
		const reader = new FileReader();

		reader.onload = (function () {
			return async function (e) {
				try {
					await loadXd(e.target.result);
				} catch(err) {
					console.error(err);
					throw "Unable to parse file";
				}
			};
		})(fileInput.files[0]);

		// Read in the image file as a data URL.
		reader.readAsText(fileInput.files[0]);
	}

	let instructionsVisible;

	function handleInstructions() {
		$$invalidate(18, instructionsVisible = true);
	}

	function downloadXD() {
		// Download contents of xd
		const file = new Blob([xd], { type: "text/plain;charset=utf-8" });

		const downloadLink = document.createElement("a");
		downloadLink.download = "crossword.xd";
		downloadLink.href = URL.createObjectURL(file);
		downloadLink.click();
	}

	function instructions_visible_binding(value) {
		instructionsVisible = value;
		$$invalidate(18, instructionsVisible);
	}

	function input0_input_handler() {
		title = this.value;
		$$invalidate(2, title);
	}

	function sizeslider_size_binding(value) {
		size = value;
		$$invalidate(15, size);
	}

	function select0_change_handler() {
		difficulty = select_value(this);
		$$invalidate(7, difficulty);
		$$invalidate(10, difficulties);
	}

	function select1_change_handler() {
		type = select_value(this);
		$$invalidate(8, type);
		$$invalidate(11, types);
	}

	function input1_input_handler() {
		date = this.value;
		$$invalidate(6, date);
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
		copyright = this.value;
		$$invalidate(5, copyright);
	}

	function input5_change_handler() {
		symmetry = this.checked;
		$$invalidate(9, symmetry);
	}

	function print_state_binding(value) {
		state = value;
		$$invalidate(16, state);
	}

	function input6_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			fileInput = $$value;
			$$invalidate(17, fileInput);
		});
	}

	function grid_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			gridComponent = $$value;
			$$invalidate(13, gridComponent);
		});
	}

	function grid_1_Container_binding(value) {
		gridComponentContainer = value;
		$$invalidate(14, gridComponentContainer);
	}

	function textarea_input_handler() {
		xd = this.value;
		$$invalidate(0, xd);
	}

	$$self.$$set = $$props => {
		if ('difficulties' in $$props) $$invalidate(10, difficulties = $$props.difficulties);
		if ('types' in $$props) $$invalidate(11, types = $$props.types);
		if ('xd' in $$props) $$invalidate(0, xd = $$props.xd);
		if ('grid' in $$props) $$invalidate(1, grid = $$props.grid);
		if ('title' in $$props) $$invalidate(2, title = $$props.title);
		if ('author' in $$props) $$invalidate(3, author = $$props.author);
		if ('editor' in $$props) $$invalidate(4, editor = $$props.editor);
		if ('copyright' in $$props) $$invalidate(5, copyright = $$props.copyright);
		if ('date' in $$props) $$invalidate(6, date = $$props.date);
		if ('difficulty' in $$props) $$invalidate(7, difficulty = $$props.difficulty);
		if ('type' in $$props) $$invalidate(8, type = $$props.type);
		if ('displayXd' in $$props) $$invalidate(12, displayXd = $$props.displayXd);
		if ('symmetry' in $$props) $$invalidate(9, symmetry = $$props.symmetry);
	};

	return [
		xd,
		grid,
		title,
		author,
		editor,
		copyright,
		date,
		difficulty,
		type,
		symmetry,
		difficulties,
		types,
		displayXd,
		gridComponent,
		gridComponentContainer,
		size,
		state,
		fileInput,
		instructionsVisible,
		handleMove,
		handleLetter,
		handleEnter,
		handleBackspace,
		handleStateChange,
		handleReset,
		handleFileSelect,
		handleInstructions,
		downloadXD,
		save_state,
		instructions_visible_binding,
		input0_input_handler,
		sizeslider_size_binding,
		select0_change_handler,
		select1_change_handler,
		input1_input_handler,
		input2_input_handler,
		input3_input_handler,
		input4_input_handler,
		input5_change_handler,
		print_state_binding,
		input6_binding,
		grid_1_binding,
		grid_1_Container_binding,
		textarea_input_handler
	];
}

class JXWordCreator extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				difficulties: 10,
				types: 11,
				save_state: 28,
				xd: 0,
				grid: 1,
				title: 2,
				author: 3,
				editor: 4,
				copyright: 5,
				date: 6,
				difficulty: 7,
				type: 8,
				displayXd: 12,
				symmetry: 9
			},
			null,
			[-1, -1]
		);
	}

	get save_state() {
		return this.$$.ctx[28];
	}
}

function dist (target, props) {
    return new JXWordCreator({
        target,
        props
    });
}

module.exports = dist;
