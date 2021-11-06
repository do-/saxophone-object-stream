module.exports = class {

	constructor (name, kvs, fieldMap) {

		this.name = name

		this.text = ''

		this.children = new Map (kvs)
		
		this.fieldMap = fieldMap
		
		this.has_elements = false

	}

	append (s) {
	
		if (this.has_elements) return

		s = s.trim (); if (!s) return

		this.text += s

	}
	
	add (e) {

		let {name} = e, {children, fieldMap} = this; if (fieldMap) {
		
			name = fieldMap.get (name)
			
			if (!name) return
		
		}
		
		if (!children.has (name)) return children.set (name, e.get_content ())
		
		let v = children.get (name); if (!Array.isArray (v)) children.set (name, v = [v])

		v.push (e.get_content ())
		
		this.has_elements = true		

	}
	
	get_content () {
	
		return this.text ? this.text : 
			
			Object.fromEntries (this.children.entries ())
	
	}

}