
const request = require('request-promise')
const _ = require('lodash')
const BPromise = require('bluebird')
const cheerio = require('cheerio')
const jschardet = require("jschardet")
const iconv = require('iconv-lite')
const numeral = require('numeral')
const moment = require('moment')
const jp = require('jsonpath')
const url = require('url')
const Entities = require('html-entities').AllHtmlEntities
const entities = new Entities()
const GraphQLJSON = require('graphql-type-json')
const {
    graphql,
    Kind,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLInt,
    GraphQLList,
    GraphQLEnumType,
    GraphQLScalarType,
    GraphQLNonNull,
} = require('graphql')

const GraphQLStringRequired = new GraphQLNonNull(GraphQLString)
const GraphQLJSONRequired = new GraphQLNonNull(GraphQLJSON)

const classify = require('./classify')

exports.classify = classify

const xselector = ({$, el, selector, relation}) => {
    let $el

    if (el) {
        $el = selector ? $(el).find(selector) : $(el)
    } else {
        $el = selector ? $(selector) : $
    }

    if (relation && typeof $el[relation] === 'function') $el = $el[relation]()

    return $el
}

const eq = ($el, index) => {
    if (!$el) return null
    if (typeof index !== 'number') return $el
    return typeof $el.eq === 'function' ? $el.eq(index) : null
}

const callWithIndex = ($el, index, method = 'text', arg) => {
    $el = eq($el, index)
    if (!$el) return null
    const text = $el[method](arg) || ''
    return typeof text === 'string' ? text.trim() : null
}

const asUrl = (option, value) => {
    const ouri = option.uri || option.url
    return url.resolve(ouri, value)
}

const textWithMatch = (text, args) => {
    if (typeof text !== 'string') return

    const {match, matchIndex, shouldRemoveWhiteSpaces, isNumber, isDate, asDate, dateFormat} = args

    if (match) {
        const regex = new RegExp(match)
        let m = text.match(regex)
        if (!m || !m[matchIndex]) return
        text = m[matchIndex].trim()
    }

    if (isNumber) {
        return numeral(text).value()
    } else if (isDate) {
        return moment(text, asDate).format(dateFormat)
    }

    if (shouldRemoveWhiteSpaces) text = text.replace(/\s+/g, ' ')

    return text
}

const convertText = (value, args, option) => {
    value = textWithMatch(value, args)
    if (!value) return
    if (args.decodeHTML) return entities.decode(value)
    return args.isUrl ? asUrl(option, value) : value
}

const TextConvertArgs = {
    match: {
        type: GraphQLString,
    },
    matchIndex: {
        type: GraphQLInt,
        defaultValue: 0,
    },
    isNumber: {
        type: GraphQLBoolean,
        defaultValue: false,
    },
    shouldRemoveWhiteSpaces: {
        type: GraphQLBoolean,
        defaultValue: true,
    },
    isDate: {
        type: GraphQLBoolean,
        defaultValue: false,
    },
    asDate: {
        type: GraphQLString,
    },
    dateFormat: {
        type: GraphQLString,
    },
    isUrl:  {
        type: GraphQLBoolean,
        defaultValue: false,
    },
    decodeHTML:  {
        type: GraphQLBoolean,
        defaultValue: false,
    },
    removeNodes:  {
        type: new GraphQLList(GraphQLString),
        defaultValue: [],
    },
}

const TextEnum = new GraphQLEnumType({
    name: 'TextEnum',
    values: {
        html: { value: 'html'},
        text: { value: 'text'},
        attr: { value: 'attr'},
        data: { value: 'data'},
        prop: { value: 'prop'},
        val: { value: 'val'},
    },
})

const TextArgs = Object.assign({
    selector: {
        type: GraphQLString,
    },
    type: {
        type: TextEnum,
        defaultValue: 'text',
    },
    typeArg: {
        type: GraphQLString,
    },
    index: {
        type: GraphQLInt,
    },
}, TextConvertArgs)

const indexDefault = (args) => Object.assign({}, args, {index: {type: GraphQLInt, defaultValue: 0}})

const callText = ($el, index, type, typeArg, args, option) => {
    args.removeNodes.forEach(selector => $el.find(selector).remove())
    const value = callWithIndex($el, index, type, typeArg)
    return convertText(value, args, option)
}

const Text = {
    type: GraphQLJSON,
    args: indexDefault(TextArgs),
    resolve: async ({$, el, option}, args) => {
        const {selector, type, typeArg, index} = args
        const $el = xselector({$, el, selector})
        return callText($el, index, type, typeArg, args, option)
    },
}

const Texts = {
    type: new GraphQLList(GraphQLJSON),
    args: TextArgs,
    resolve: async ({$, el, option}, args) => {
        const {selector, type, typeArg, index} = args
        const $el = xselector({$, el, selector, index})
        return $el.toArray().map(d => callText($(d), index, type, typeArg, args, option))
    },
}

const HTMLJSON = new GraphQLObjectType({
    name: 'HTMLJSON',
    fields: () => ({
        echo: Echo,
        count: Count,
        node: Node,
        nodes: Nodes,
        text: Text,
        texts: Texts,
        href: Href,
        fetchHTML: FetchHTML,
        fetchHTMLs: FetchHTMLs,
        fetchJSON: FetchJSON,
        fetch: Fetch,
        nest: Nest,
    }),
})

const NodeEnum = new GraphQLEnumType({
    name: 'NodeEnum',
    values: {
        prev: { value: 'prev'},
        next: { value: 'next'},
        parent: { value: 'parent'},
    },
})

const Count = {
    type: GraphQLInt,
    args: {
        selector: {
            type: GraphQLStringRequired,
        },
        relation: {
            type: NodeEnum
        },
    },
    resolve: async (D, {selector, relation}) => {
        const {$, el} = D
        const $el = xselector({$, el, selector, relation})
        return $el.length
    },
}

const Echo = {
    type: GraphQLJSON,
    args: {
        message: {
            type: GraphQLJSON,
        },
        isArray: {
            type: GraphQLBoolean,
            defaultValue: false,
        },
    },
    resolve: ({ii} = {}, {message, isArray}) => isArray ? message[ii] : message,
}

const callNode = ($el, D) => Object.assign({}, D, {el: $el})

const Node = {
    type: HTMLJSON,
    args: {
        selector: {
            type: GraphQLString,
        },
        relation: {
            type: NodeEnum
        },
        index: {
            type: GraphQLInt,
            defaultValue: 0,
        },
    },
    resolve: async (D, {selector, relation, index}) => {
        const {$, el} = D
        const $el = xselector({$, el, selector, relation})
        return callNode(eq($el, index), D)
    },
}

const Nodes = {
    type: new GraphQLList(HTMLJSON),
    args: {
        selector: {
            type: GraphQLStringRequired,
        },
    },
    resolve: async (D, {selector, relation}) => {
        const {$, el} = D
        const $el = xselector({$, el, selector})
        return $el.toArray().map(d => callNode(d, D))
    },
}

const html2utf8 = (d, encodingWant) => {
    let { encoding } = jschardet.detect(d)
    if (encoding === 'GB2312') encoding = 'GB18030'
    return encoding ? iconv.decode(d, encodingWant || encoding) : d
}

const fixOption = (option, uri) => {
    const refreshUrl = asUrl(option, uri)
    if (option.uri) option.uri = refreshUrl
    if (option.url) option.url = refreshUrl
}

const metaRefresh = async (html = '', option) => {
    const match = html.match(/<meta http-equiv="refresh" content="\d+\s*;\s*url=(.*?)">/i)
    if (!match) return html
    fixOption(option, match[1])
    return await utf8request(option)
}

const utf8request = async (option, extendOption = {}) => {
    const encoding = option.encoding
    const optionNext = Object.assign({}, option, extendOption, {jar: true, encoding: null, followRedirect: (res) => {
        fixOption(option, res.headers.location)
        return true
    }})
    let html = await request(optionNext)
    html = html2utf8(html, encoding)
    html = await metaRefresh(html, option)
    return html
}

const TIMEOUT = 5 * 1000

const normalizeOption = (option, req) => {

    const headers = {}

    if (req) {
        const userAgent = req.header('User-Agent')
        headers['User-Agent'] = userAgent
    }

    if (typeof option === 'string') option = {uri: option}

    if (typeof option.timeout === 'undefined') option.timeout = TIMEOUT
    option.headers = Object.assign({}, headers, option.headers)

    return option
}

const HrefArgs = {
    selector: {
        type: GraphQLString,
    },
    type: {
        type: GraphQLString,
        defaultValue: 'attr',
    },
    typeArg: {
        type: GraphQLString,
        defaultValue: 'href',
    },
    index: {
        type: GraphQLInt,
    },
    option: {
        type: GraphQLJSON,
    },
}

const Href = {
    type: HTMLJSON,
    args: indexDefault(HrefArgs),
    resolve: async ({$, el, option}, {selector, type, typeArg, index, option: option2}) => {
        const $el = xselector({$, el, selector})
        const value = callWithIndex($el, index, type, typeArg)
        const uri = asUrl(option, value)
        option = Object.assign({}, option, option2, {uri})
        const html = await utf8request(option)
        $ = cheerio.load(html)
        return {$, el: null, option}
    },
}

const ClassifyHTML = {
    type: GraphQLJSON,
    args: {
        option: {
            type: GraphQLJSONRequired,
        },
        context: {
            type: GraphQLString,
            defaultValue: 'body',
        },
    },
    resolve: async (d, {option, context}, req) => {
        option = normalizeOption(option, req)
        const html = await utf8request(option)
        return classify(html, context)
    },
}

const FetchHTML = {
    type: HTMLJSON,
    args: {
        option: {
            type: GraphQLJSONRequired,
        },
    },
    resolve: async (d, {option, ii}, req) => {
        option = normalizeOption(option, req)
        const html = await utf8request(option)
        const $ = cheerio.load(html)
        return {$, el: null, option, ii}
    },
}

const FetchHTMLs = {
    type: new GraphQLList(HTMLJSON),
    args: {
        options: {
            type: new GraphQLList(GraphQLJSONRequired),
            defaultValue: [],
        },
        concurrency: {
            type: GraphQLInt,
            defaultValue: 1,
        },
    },
    resolve: async (d, {options, concurrency}, req) => {
        return BPromise.map(options, (option, ii) => FetchHTML.resolve(d, {option, ii}, req), {concurrency})
    },
}

const FetchJSON = {
    type: GraphQLJSON,
    args: {
        option: {
            type: GraphQLJSONRequired,
        },
        path: {
            type: GraphQLJSON,
        },
    },
    resolve: async (D, {option, path}, req) => {
        option = normalizeOption(option, req)
        const res = await utf8request(option, {json: true})
        if (typeof path === 'string') return jp.query(res, path)
        if (Array.isArray(path)) return path.map(dpath => jp.query(res, dpath))
        if (path && typeof path === 'object') return _.mapValues(path, dpath => jp.query(res, dpath))
        return res
    },
}

const Fetch = {
    type: GraphQLJSON,
    args: {
        option: {
            type: GraphQLJSONRequired,
        },
    },
    resolve: async (D, {option}, req) => {
        option = normalizeOption(option, req)
        const res = await utf8request(option)
        return res
    },
}

const Nest = {
    type: HTMLJSON,
    resolve: () => ({}),
}

const Query = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        classifyHTML: ClassifyHTML,
        fetchHTML: FetchHTML,
        fetchHTMLs: FetchHTMLs,
        fetchJSON: FetchJSON,
        fetch: Fetch,
        echo: Echo,
        nest: Nest,
    }),
})

const schema = new GraphQLSchema({query: Query})

exports.schema = schema

const grequest = ({query, variables, operationName, context}) => graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
    contextValue: context,
})

exports.request = grequest
