const {Transform} = require ('stream')
const Saxophone   = require ('saxophone')
const Element   = require ('./Element')

const XMLReader = class extends Transform {

	constructor (options = {}) {

		options.readableObjectMode = true
		
		let {encoding} = options; delete options.encoding
						
		super (options)
		
		this.encoding     = encoding || 'utf8'
		
		this.level        = 'level' in options ? options.level : 1
		
		this.localName    = options.localName
		this.nameSpace    = options.nameSpace

		this.wrap         = !!options.wrap

		this.noAttributes = !!options.noAttributes
		
		if (!('nsPrefixes' in options)) options.nsPrefixes = this.noAttributes ? 'ignore' : 'strip'
		if (this.noAttributes && options.nsPrefixes != 'ignore') throw new Error ('With noAttributes, cannot ' + options.nsPrefixes + ' nsPrefixes')

		switch (options.nsPrefixes) {
			
			case 'ignore':
				this.ignore_namespaces = true
				if (!options.rename) options.rename = s => s
				break

			case 'strip':
				this.ignore_namespaces = false
				this.use_namespaces = false
				if (!options.rename) options.rename = s => s
				break
				
			case 'use':
				throw new Error ('This nsPrefixes option value is not yet implemented: ' + options.nsPrefixes)
				
			default: 
				throw new Error ('Invalid nsPrefixes option value: ' + options.nsPrefixes)

		}
		
		this.rename = options.rename

		this.parser = new Saxophone ()
		
		this.parser.on ('error', error => this.destroy (error))
		
		this.parser.on ('text', ({contents}) => this.txt (contents))
		
		this.parser.on ('tagclose', ({name}) => this.tag_close (name))
		
		this.parser.on ('tagopen', ({name, attrs, isSelfClosing}) => {

			this.tag_open (name,
				this.noAttributes  ? null :
				attrs.length === 0 ? null :
				Saxophone.parseAttrs (attrs)
			)

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
		
		let localName, nameSpace
		
		if (this.ignore_namespaces) {
		
			localName = name
		
		}
		else {

			let pos = name.indexOf (':'); if (pos < -1) {

				localName = name

			} 
			else {
			
				localName = name.slice (pos + 1)
			
			}
			
		}
		
		name = this.rename (localName, nameSpace, false)
		
		let {stack} = this; if (
			stack.length === 0 
			&&   this.localName && this.localName != localName
			&& (!this.nameSpace || this.nameSpace != nameSpace)
		) return
		
		let kvs = null; if (attr !== null) {
		
			if (this.ignore_namespaces) {
			
				kvs = Object.entries (attr)
			
			}
			else {
			
				kvs = []; for (let [k, v] of Object.entries (attr)) {
				
					if (k === 'xmlns') {
						if (this.use_namespaces) {
							// TODO
						}
						continue
					}
					else if (/^xmlns:/.test (k)) {
						if (this.use_namespaces) {
							// TODO
						}
						continue
					}

					let ln, ns, pos = k.indexOf (':'); if (pos < -1) {
						ln = k
					} 
					else {
						ln = k.slice (pos + 1)
					}
					
					kvs.push ([this.rename (ln, ns, true), v])
				
				}
			
			}
		
		}

		stack.push (new Element (name, kvs))

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