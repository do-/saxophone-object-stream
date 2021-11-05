module.exports = class {

	constructor () {
	
		this.defs = [null]
		this.maps = [new Map ()]

	}
	
	pop () {
		this.maps.pop ()
		this.defs.pop ()
	}

	push (attr) {
	
		let {defs, maps} = this; 
	
		defs.push (defs [defs.length - 1])
		maps.push (new Map (maps [maps.length - 1]))

		if (!attr) return
		
		{

			const K = 'xmlns'; if (K in attr) {

				defs [defs.length - 1] = attr [K] || null

				delete attr [K]

			}

		}
		
		for (let k in attr) if (/^xmlns:/.test (k)) {

			maps [maps.length - 1].set (k.slice (6), attr [k])

			delete attr [k]

		}
	
	}

	get (k) {
	
		if (!k) return this.defs [this.defs.length - 1]
		
		let {maps} = this; for (let i = maps.length - 1; i > 0; i --) {

			let v = maps [i].get (k)
			
			if (v) return v
			
		}
		
		throw new Error ('Unknown namespace prefix occured: ' + k + '. The current map is: ' + JSON.stringify (Object.fromEntries (maps [maps.length - 1])))
	
	}

}