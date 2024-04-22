
const _ = require('lodash')
const cheerio = require('cheerio')

const toTagName = ($el) => $el.get(0).tagName.toLowerCase()
const toClass = ($el) => ($el.attr('class') || '').trim()
const toID = ($el) => ($el.attr('id') || '').trim()

const isCommon = (d) => !/\d+$/.test(d)

const getSelector = ($el) => {
    const id = toID($el)
	const className = toClass($el)
	const tagName = toTagName($el)

    let selector = tagName
    if (id && isCommon(id)) selector += '#' + id
    if (className) {
        const commonClassNames = _.chain(className).split(/\s+/).value()
        if (commonClassNames.length > 0) selector += '.' + commonClassNames.join('.')
    }

    return selector
}

const getSelectors = ($el, $) => {
    $el = $el.first()
    const selector = getSelector($el)
	const parentSelectors = $el.parents().toArray().map(d => getSelector($(d)))
    return _.chain(selector).concat(parentSelectors).reverse().value()
}

const findTheSame = (selectors) => {
    if (selectors.length <= 1) return 0
    const shortest = _.chain(selectors).maxBy(d => d.length).value()
    let i = 0
    while(_.every(selectors, d => d[i] === shortest[i])) i++
    return i
}

const shorten = (grouped, $) => {

    const selectors = _.map(grouped, 'selector')
    const i = findTheSame(selectors)
    if (i > 0) grouped.forEach(d => d.selector = d.selector.slice(i))

	return _.filter(grouped, d => d.selector.length > 0)
}

const sep = ' '

const slice = (selectors, i) => {
    return selectors.map((d) => Object.assign({}, d, {selector: d.selector.slice(i)}))
}

const expandKey = (key, selector, j) => {
    return _.chain(key).concat(selector.slice(0, j)).join(sep).value()
}

const lengthKey = (key, length) => `(${length}) ${key}`

const groupBy = (selectors) => {

    const [more, one] = _.partition(selectors, ({selector}) => selector.length > 1)

    const group = _.chain(more)
        .groupBy('selector.0')
        .map((values, key) => {
            values = slice(values, 1)

            const j = findTheSame(_.map(values, 'selector'))

            if (j > 0) {
                key = expandKey(key, values[0].selector, j)
                values = slice(values, j)
            }

            if (values.length > 1) {
                values = groupBy(values)
            } else {
                const {selector, text, length} = values[0]
                key = lengthKey(expandKey(key, selector), length)
                values = text
            }

            return [key, values]
        })
        .concat(one.map(({selector, text, length}) => [lengthKey(selector, length), text]))
        .fromPairs()
        .value()

    return group
}

const isLeaf = (selector, selectors) => {
    return !_.some(selectors, d => d !== selector && _.startsWith(d, selector))
}

const classify = (html, context) => {
	const $ = cheerio.load(html)

    context = context ? `${context} *` : '*'
	let classes = $(context)

	classes = classes.map((i, el) => {
		const $el = $(el)
		const selectors = getSelectors($el, $)
        const text = $el.text().trim().replace(/\s+/, ' ')
		return {selectors, text}
	}).get()

	let grouped = _.chain(classes)
		.groupBy(d => d.selectors.join(sep))
		.map((value, selector) => ({selector: selector.split(sep), text: value[0].text, length: value.length}))
		.value()

	grouped = shorten(grouped, $)

    const selectors = _.map(grouped, d => d.selector.join(sep))

	grouped = _.chain(grouped)
		.orderBy('length', 'desc')
        .filter(d => isLeaf(d.selector.join(sep), selectors))
		.value()

    const data = groupBy(grouped)
    return data
}

module.exports = classify
