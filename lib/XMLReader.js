const {Transform} = require ('stream')
const  Saxophone  = require ('saxophone')
const  Element    = require ('./Element')
const  NSStack    = require ('./NSStack')

const EMPTY_ARRAY = []
const RENAME_TO_LOCAL = s => s
const RENAME_SHOW_NS  = (l, n) => n ? `{${n}}${l}` : l

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
		this.noText       = !!options.noText

		this.filter       = options.filter
		this.fieldMap     = options.fieldMap
		
		if (this.fieldMap && !(this.fieldMap instanceof Map)) this.fieldMap = new Map (Object.entries (this.fieldMap))
		
		if (!('nsPrefixes' in options)) options.nsPrefixes = this.noAttributes ? 'ignore' : 'strip'
		if (this.noAttributes && options.nsPrefixes != 'ignore') throw new Error ('With noAttributes, cannot ' + options.nsPrefixes + ' nsPrefixes')

		switch (options.nsPrefixes) {
			
			case 'ignore':
				this.ignore_namespaces = true
				if (!options.rename) options.rename = RENAME_TO_LOCAL
				break

			case 'strip':
				this.ignore_namespaces = false
				this.use_namespaces = false
				if (!options.rename) options.rename = RENAME_TO_LOCAL
				break
				
			case 'use':
				this.ignore_namespaces = false
				this.use_namespaces = true
				this.nsStack = new NSStack ()
				if (!options.rename) options.rename = RENAME_SHOW_NS
				break
				
			default: 
				throw new Error ('Invalid nsPrefixes option value: ' + options.nsPrefixes)

		}
		
		if (!this.use_namespaces && this.nameSpace) throw new Error ('The nameSpace option is only available with nsPrefixes:use')
		
		this.rename = options.rename

		this.parser = new Saxophone ()
		
		this.parser.on ('error', error => this.destroy (error))

		if (!this.noText) this.parser.on ('text', ({contents}) => this.txt (contents))

		this.parser.on ('tagclose', ({name}) => this.tag_close (name))
		
		this.parser.on ('tagopen', ({name, attrs, isSelfClosing}) => {

			this.tag_open (name, this.noAttributes ? '' : attrs.trim ())

			if (isSelfClosing) this.tag_close (name)
		
		})
		
		this.depth = -1
		
		this.stack = []
		
		this._localName = null
		this._nameSpace = null
		
	}
	
	peek () {
	
		let {stack} = this, {length} = stack

		return length === 0 ? null : stack [length - 1]
	
	}
	
	txt (s) {
		
		let last = this.peek (); if (last == null) return
			
		last.append (s)

	}

	tag_open (name, attrs) {
	
		delete this._attr_map

		this.depth ++

		if (this.use_namespaces) {

			this.nsStack.push ()

			this.parse_attrs (attrs)

		}
		
		if (this.depth < this.level) return
		
		this.parse_name (name, false) 
		
		let {stack} = this; if (stack.length === 0 && this.localName) {

			if (this.localName != this._localName) return
			
			if (this.use_namespaces && this.nameSpace && this.nameSpace != this._nameSpace) return

		}
		
		if (!this._attr_map && !this.noAttributes) this.parse_attrs (attrs)

		stack.push (new Element (this.get_name (false), this._attr_map))

	}
	
	parse_name (name, is_attr) {

		this._nameSpace = null		

		if (this.ignore_namespaces) return this._localName = name
		
		let pos = name.indexOf (':'), {use_namespaces, nsStack} = this
		
		if (pos < 0) {
		
			this._localName = name
			
			if (!is_attr && use_namespaces) this._nameSpace = nsStack.get (null)

		}
		else {

			this._localName = name.slice (pos + 1)

			if (use_namespaces) this._nameSpace = nsStack.get (name.slice (0, pos))

		}

	}
	
	get_name (is_attr) {

		let name = this.rename (this._localName, this._nameSpace, is_attr)

		if (this.stack.length !== 0) return name
		
		let {fieldMap} = this; if (!fieldMap) return name
		
		return fieldMap.get (name)

	}
	
	parse_attrs (attrs) {
	
		this._attr_map = new Map (); if (attrs.length === 0) return

		const tokens = attrs.split (/="|"\s*/), {ignore_namespaces, use_namespaces} = this

		for (let i = 0; i < tokens.length - 1; i ++) {
		
			let k = tokens [i ++]

			if (ignore_namespaces || !/^xmlns/.test (k)) {
			
				this.parse_name (k, true)

				let name = this.get_name (true)
				
				if (name) this._attr_map.set (name, tokens [i])
				
				continue

			}
			
			if (use_namespaces) this.nsStack.set (
			
				k.length === 5 ? null : k.slice (6), // 'xmlns' - default, 'xmlns:...' - named

				tokens [i]
			
			)
			
		}
	
	}

	tag_close (name) {

		this.depth --

		if (this.use_namespaces) this.nsStack.pop ()
		
		let {stack} = this, {length} = stack; if (length === 0) return
		
		let e = stack.pop (); if (length === 1) return this.publish (e)

		this.peek ().add (e)

	}
	
	publish (e) {
	
		let c = e.get_content ()
		
		if (this.filter && !this.filter (c)) return
	
		this.push (this.wrap ? {[e.name]: c} : c)

	}

	_transform (data, _, callback) {

		this.parser.write (data.toString (this.encoding))

		callback ()

	}
	
}

XMLReader.get = async function (src, options) {

	let list = [], xr = new XMLReader (options)

	return new Promise ((ok, fail) => {

		xr.on ('error', fail)

		if (typeof src === 'string' || Buffer.isBuffer (src)) {
			xr.end (src)
			xr.on ('data', ok)
		}
		else {		
			src.on ('error', fail)
			xr.on ('data', r => {
				src.unpipe (xr)
				src.destroy ()
				ok (r)
			})
			src.pipe (xr)
		}

	})

}

XMLReader.list = async function (src, options) {

	let list = [], xr = new XMLReader (options)

	return new Promise ((ok, fail) => {

		xr.on ('error', fail)

		xr.on ('data', r  => list.push (r))
		xr.on ('end',  () => ok (list))

		if (typeof src === 'string' || Buffer.isBuffer (src)) {
			xr.end (src)
		}
		else {
			src.on ('error', fail)
			src.pipe (xr)
		}

	})

}

module.exports = {XMLReader}