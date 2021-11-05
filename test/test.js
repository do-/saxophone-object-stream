const FN_LIST = 'test/list.xml'
const FN_SOAP = 'test/soap.xml'

const assert = require ('assert')
const fs     = require ('fs')

const {XMLReader} = require ('..')

async function test_list () {

	let get_is = () => fs.createReadStream (FN_LIST)
	
	let l = await XMLReader.list (get_is (), {})

console.log (l)

}

async function test_soap () {

	let get_is = () => fs.createReadStream (FN_SOAP)
	
	let l = await XMLReader.list (get_is (), {
		level: 0,
		wrap: true,
//		noAttributes: true,
//		localName: 'SenderProvidedRequestData',
	})
console.log (JSON.stringify (l, null, 2))

}

async function main () {

//	await test_list () 
	await test_soap () 

}

main ()