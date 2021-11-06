module.exports = class {

	constructor () {
	
		this.stack = [null, new Map ()]
	
	//	this.defs = [null]
	//	this.maps = [new Map ()]

	}
	
	pop () {
		this.stack.pop ()
	}

	peek () {
		return this.stack [this.stack.length - 1]
	}
	
	set (k, v) {
	
		let head = this.peek ()
		
		if (k === null) {
			head [0] = v || null
		}
		else {
			head [1].set (k, v)
		}

	}

	push (attr) {
	
		let [d, m] = this.peek ()
		
		this.stack.push ([d, new Map (m)])
	
	}

	get (k) {
			
		let {stack} = this; for (let i = stack.length - 1; i > 0; i --) {
		
			let [def, map] = stack [i]
	
			if (!k) return def

			let v = map.get (k)
			
			if (v) return v
			
		}
		
		throw new Error ('Unknown namespace prefix occured: ' + k + '. The current map is: ' + JSON.stringify (Object.fromEntries (maps [maps.length - 1])))
	
	}

}