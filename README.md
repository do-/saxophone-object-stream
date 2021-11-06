`saxophone-object-stream` is a node.js module for transforming xml to object stream using [Saxophone](https://github.com/matteodelabre/saxophone).

The [Motivation](https://github.com/do-/saxophone-object-stream/wiki/Motivation) behid this project is described in a separate article.

# Using
As stream transformer:
```js
const {XMLReader} = require ('saxophone-object-stream')

let src = getXMLAsReadableBinaryStream ()
let dst = getObjectWritableStream ()

let reader = new XMLReader ({
// encoding     : 'utf-8',                     // as usual
// level        : 1,                           // 0 for document element
// localName    : 'TheRecord',                 // if you don't need any other on the same level
// nameSpace    : 'urn:...',                   // if there might be some confusion
// wrap         : true,                        // to show element name above its content
// filter       : r => r.on,                   // think Array filter
// attrsFilter  : s => s.includes ('on="1"')   // same, but operates on unparsed attributes substring
// noAttributes : true,                        // in some XML, all field values are text nodes
// noText       : true,                        // ...in some other, no text, attributes only
// nsPrefixes   : 'strip' | 'ignore' | 'use',  // what to do with those 'ns123:' things
// rename       : (local, ns) => local,        // xml name to js name
// fieldMap     : {CODE: 'id', NAME: 'label'},  
})

src.pipe (reader).pipe (dst)
```
As atomic reader:
```js
const {XMLReader} = require ('saxophone-object-stream')

let src = getXMLAsReadableBinaryStream ()
// let src = '<?xml version="1.0"?><...'

let allObjects = await XMLReader.list (src, { // CAUTION! MAY EXHAUST THE MEMORY!
  // ... same options ...
})

// OR

let firstObject = await XMLReader.get (src, {
  // ... same options ...
})
```

## Options

|Name|Type|Description|Note
|-|-|-|-|
|`encoding`|string|Name of the character encoding|`utf-8` by default
|`level`|number|Base level of elements to read|0 means root element, 1 is the default
|`localName`|string|Local name of elements to read|if set without `nameSpace`, any NS goes
|`nameSpace`|string|NS URL of elements to read|URL, not prefix
|`wrap`|boolean|Whether to show element name in a wrapping object|false by default
|`filter`|Object => Boolean|Objects for which it is not `true` are skipped|Unless set, ignored
|`attrsFilter`|String => Boolean|Same as above...|...but sees the raw attributes substring
|`nsPrefixes`|`'strip'/'ignore'/'use'`|What to do with namespace prefixes|
|`noAttributes`|boolean|If true, no attributes nor NS declarations are parsed at all|Implies `NSPrefixes:'ignore'`
|`noText`|boolean|If true, all text nodes are ignored|For flat XML with data fields represented by attributes
|`rename`|(local, ns, isAttr) => jsName|Global name mapping function|
|`fieldMap`|Map or Object|Root objects field map|Applied after `rename`, acts only on root objects

`nsPrefixes` values:
|Value|Deafult output for `ns:tagName`|`xmlns` attributes|Description|Note
|-|-|-|-|-|
|`strip`|`tagName`|skipped|NS prefixes are stripped off, element and attribute names may conflict|Default behavior
|`ignore`|`ns:tagName`|shown|Names, including `:`, are treated as local ones. Keys starting with 'xmlns' may appear in output|Faster (especially with `noAttributes`), but normally is to be used with XML really not having any xmlns attributes
|`use`|`{urn:...}tagName`|processed|NS URLs are evaluated according to specification and supplied to `rename` function|Slowest, but most flexible and standards compliant option.

## Examples
### Example 1: flat list
XML:
```xml
<HOUSETYPES>
  <HOUSETYPE ID="1" STARTDATE="2015-12-25" ENDDATE="2079-06-06" />
  <HOUSETYPE ID="2" STARTDATE="2015-12-25" ENDDATE="2079-06-06" />
</HOUSETYPES>
```
options:
```js
const NOW = new Date ().toJSON ().slice (0, 10)
//...
{
  level      : 1,                     // not really needed, this is the default
  localName  : 'HOUSETYPE',           // at this level, no other elements
  filter     : i => i.ENDDATE >= NOW, // in production, precompute it!
  fieldMap     : {
    ID: 'id', 
    STARTDATE: 'dt_from'
  },
}
```
result:
```js
  {id: '1', dt_from: '2015-12-25'},
  {id: '2', dt_from: '2015-12-25'},
```
### Example 2: nested structure
XML:
```xml
<?xml version="1.0"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Header/>
  <SOAP-ENV:Body>
    <SendRequestRequest xmlns="urn://x-artefacts-smev-gov-ru/services/message-exchange/types/1.1" xmlns:ns0="urn://x-artefacts-smev-gov-ru/services/message-exchange/types/basic/1.1">
      <SenderProvidedRequestData Id="Ue7e71ce1-7ce3-4ca5-a689-1a8f2edbb1af">
        <MessageID>3931cda8-3245-11ec-b0bc-000c293433a0</MessageID>
        <ns0:MessagePrimaryContent>
          <ExportDebtRequestsRequest xmlns="urn:dom.gosuslugi.ru/debt-responses/1.0.0" xmlns:ns0="urn:dom.gosuslugi.ru/common/1.2.0">
            <ns0:information-system-id>35a823b4-55da-4622-a561-6bae5c0a00ba</ns0:information-system-id>
            <ns0:organization-id>6eef689e-48bb-4eb0-9c11-18b6db9909b7</ns0:organization-id>
            <request-id>bac4c940-6ad3-11eb-9439-0242ac130002</request-id>
            <request-id>00000000-0000-0000-0000-000000000000</request-id>
          </ExportDebtRequestsRequest>
        </ns0:MessagePrimaryContent> 
...
```
options:
```js
{
  level      : 3, 
  localName  : 'SenderProvidedRequestData',
  wrap       : true,
}
```
result:
```js
  {SenderProvidedRequestData: {
    Id="Ue7e71ce1-7ce3-4ca5-a689-1a8f2edbb1af",
    MessageID: '3931cda8-3245-11ec-b0bc-000c293433a0', 
    MessagePrimaryContent: {
      ExportDebtRequestsRequest: {
        'information-system-id': '23b435a8-a561-55da-4622-0a00ba6bae5c',
        'organization-id': '689e6eef-9c11-48bb-4eb0-9909b718b6db',
        'request-id': ['bac4c940-6ad3-11eb-9439-0242ac130002', '00000000-0000-0000-0000-000000000000']
      },
    }
  },
```
for options:
```js
{
  level      : 4, 
  localName  : 'MessageID',
  wrap       : false,       // as by default
}
```
the result will be simply 
```js
'3931cda8-3245-11ec-b0bc-000c293433a0'
```
