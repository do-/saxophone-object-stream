const {Transform} = require ('stream')
const Saxophone   = require ('saxophone')
const Element   = require ('./Element')

const XMLReader = class extends Transform {

	constructor (options = {}) {

		options.readableObjectMode = true
		
		let {encoding} = options; delete options.encoding
						
		super (options)
		
		this.encoding  = encoding || 'utf8'
		
		this.level     = 'level' in options ? options.level : 1
		
		this.localName = options.localName

		this.wrap      = !!options.wrap
		
		this.parser = new Saxophone ()
		
		this.parser.on ('error', error => this.destroy (error))
		
		this.parser.on ('text', ({contents}) => this.txt (contents))
		
		this.parser.on ('tagclose', ({name}) => this.tag_close (name))
		
		this.parser.on ('tagopen', ({name, attrs, isSelfClosing}) => {
		
			this.tag_open (name, Saxophone.parseAttrs (attrs))

			if (isSelfClosing) this.tag_close (name)
		
		})
		
		this.depth = -1
		
		this.stack = []
		
	}
	
	peek () {
	
		let {stack} = this, {length} = stack

		return length === 0 ? null : stack [length - 1]
	
	}
	
	txt (s) {
		
		let last = this.peek (); if (last == null) return
			
		last.append (s)

	}

	tag_open (name, attr) {
	
		this.depth ++
		
		if (this.depth < this.level) return
		
		let {stack} = this; if (stack.length === 0 && this.localName && this.localName != name) return
				
		stack.push (new Element (name, Object.entries (attr)))

	}
	
	tag_close (name) {

		this.depth --
		
		let {stack} = this, {length} = stack; if (length === 0) return
		
		let e = stack.pop (); if (length === 1) return this.publish (e)

		this.peek ().add (e)

	}
	
	publish (e) {
	
		let c = e.get_content ()
	
		this.push (this.wrap ? {[e.name]: c} : c)

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