module.exports = class {
	
	constructor (name, children) {

		this.name = name

		this.text = ''

		this.children = children || new Map ()
		
		this.has_elements = false

	}	

	append (s) {
	
		if (this.has_elements) return

		s = s.trim (); if (!s) return

		this.text += s

	}
	
	add (e) {

		let {name} = e, {children} = this
		
		if (!children.has (name)) return children.set (name, e.get_content ())
		
		let v = children.get (name); if (!Array.isArray (v)) children.set (name, v = [v])

		v.push (e.get_content ())
		
		this.has_elements = true		

	}

	get_content () {

		let {text} = this; if (text.length > 0) return text
		
		let {children} = this; if (children.size > 0) return Object.fromEntries (this.children.entries ())

		return null
	
	}		

}