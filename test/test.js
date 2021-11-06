const FN_LIST = 'test/list.xml'
const FN_SOAP = 'test/soap.xml'

const assert = require ('assert')
const fs     = require ('fs')

const {XMLReader} = require ('..')

async function test_list () {

//	let get_is = () => fs.createReadStream (FN_LIST)
	let get_is = () => fs.readFileSync (FN_LIST)
	
	let l = await XMLReader.list (get_is (), {
/*
		fieldMap: {
			ID: 'id',
			NAME: 'label',
			ISACTIVE: 'is_active',
    	},
*/
//		filter: i => i.is_active === 'true',
		noText: true,
//		noAttributes: true,
//		wrap: true,
	})

console.log (l)

}

async function test_soap () {

	let get_is = () => fs.createReadStream (FN_SOAP)
//	let get_is = () => fs.readFileSync (FN_SOAP)
	let src = get_is ()
	
	let l = await XMLReader.get (src, {
		level: 3,
//		wrap: true,
//		filter: i => i.Id,
//		nsPrefixes: 'use',
//		nsPrefixes: 'ignore',
//		noAttributes: true,
//		noText: true,
//		localName: 'SenderProvidedRequestData',
//		nameSpace: 'urn://x-artefacts-smev-gov-ru/services/message-exchange/types/1.1',
	})
console.log (JSON.stringify (l, null, 2))

}

async function main () {

	let not_now = Date.now ()

//	await test_list () 
	await test_soap () 

console.log ((Date.now () - not_now) + ' ms')

}

main ()