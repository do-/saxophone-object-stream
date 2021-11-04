module.exports = class {

	constructor (name, kvs = []) {

		this.name = name

		this.text = ''

		this.children = new Map (kvs)

	}

	append (s) {

		s = s.replace (/\s+/g, ' ').trim (); if (!s) return

		this.text += s

	}
	
	add (e) {

		let {children} = this

		let {name} = e; if (!children.has (name)) return children.set (name, e.get_content ())
		
		let v = children.get (name); if (!Array.isArray (v)) children.set (name, v = [v])

		v.push (e.get_content ())

	}
	
	get_content () {
	
		return this.text ? this.text : 
			
			Object.fromEntries (this.children.entries ())
	
	}

}