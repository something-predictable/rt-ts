import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { create } from '../index.js'

export type B = boolean
export type N = number
export type S = string
export type BI = bigint

const expected = `
export function isB(u: unknown) {
    return typeof u === "boolean";
}
export function isN(u: unknown) {
    return typeof u === "number";
}
export function isS(u: unknown) {
    return typeof u === "string";
}
export function isBI(u: unknown) {
    return typeof u === "bigint";
}
`.trim()

describe('emit ts', () => {
    it('handles cases.ts', async () => {
        assert.deepStrictEqual(
            print(
                create(
                    ts.createSourceFile('index.ts', await readFile('test/index.ts', 'utf-8'), {
                        languageVersion: ts.ScriptTarget.ES2024,
                    }),
                ),
            ),
            expected,
        )
    })
})

function print(
    nodes: {
        name: ts.Identifier
        type: ts.TypeNode
        checkFunction: ts.FunctionDeclaration
    }[],
) {
    const resultFile = ts.createSourceFile(
        'index.rt.ts',
        '',
        ts.ScriptTarget.Latest,
        /*setParentNodes*/ false,
        ts.ScriptKind.TS,
    )
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        omitTrailingSemicolon: true,
    })

    const code = nodes
        .flatMap(n => [printer.printNode(ts.EmitHint.Unspecified, n.checkFunction, resultFile)])
        .join('\n')

    return code
}
