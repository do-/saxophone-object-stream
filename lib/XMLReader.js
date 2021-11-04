const {Transform} = require ('stream')
const Saxophone   = require ('saxophone')

const XMLReader = class extends Transform {

	constructor (options = {}) {

		options.readableObjectMode = true
		
		let {encoding} = options; delete options.encoding
						
		super (options)
		
		this.encoding = encoding      || 'utf8'
		
		this.level    = options.level || 1
		
		this.localName = options.localName

		this.wrap     = !!options.wrap
		
		this.parser = new Saxophone ()
		
		this.parser.on ('error', error => this.destroy (error))
		
		this.parser.on ('finish', () => console.log ('parser.finish'))
		
		this.parser.on ('text', ({contents}) => this.txt (contents))
		
		this.parser.on ('tagclose', ({name}) => this.tag_close (name))
		
		this.parser.on ('tagopen', ({name, attrs, isSelfClosing}) => {
		
			this.tag_open (name, Saxophone.parseAttrs (attrs))

			if (isSelfClosing) this.tag_close (name)
		
		})
		
		this.depth = -1
		
		this.stack = []
		
		this.TXT_KEY = Symbol ('txt')

	}
	
	txt (s) {
		
		if (this.stack.length === 0) return
	
		s = s.replace (/\s+/g, ' ').trim (); if (!s) return
		
		this.peek_value () [this.TXT_KEY] += s

	}

	tag_open (name, attr) {
	
		this.depth ++
		
		if (this.depth < this.level) return
		
		if (this.localName && this.localName != name) return
		
		attr [this.TXT_KEY] = ''
		
		this.stack.push ({[name]: attr})

	}		

	tag_close (name) {

		this.depth --
		
		let {stack} = this, {length} = stack; if (!length) return
		
		let o = stack.pop (); if (length === 1) return this.publish (o)
		
		this.fetch_text (o)
		
		let [[k, v]] = Object.entries (o)

		this.peek_value () [k] = v

	}
	
	fetch_text (o) {

		const {TXT_KEY} = this;
		
		let [[k, v]] = Object.entries (o)

		let txt = v [TXT_KEY]; if (txt) return o [k] = txt
		
		delete v [TXT_KEY]

	}
	
	peek_value () {
	
		let {stack} = this

		for (let v of Object.values (stack [stack.length - 1])) return v
	
	}
	
	publish (o) {
	
		this.fetch_text (o)

		this.push (this.wrap ? o : Object.values (o) [0])

	}
			
	_transform (data, _, callback) {

		this.parser.write (data.toString (this.encoding))

		callback ()

	}
	
}

XMLReader.list = async function (is, options) {

	let list = [], xr = new XMLReader (options)

	return new Promise ((ok, fail) => {

		is.on ('error', fail)
		xr.on ('error', fail)

		xr.on ('data', r  => list.push (r))
		xr.on ('end',  () => ok (list))

		is.pipe (xr)

	})

}

module.exports = {XMLReader}