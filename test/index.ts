import assert from 'node:assert/strict'
// eslint-disable-next-line no-restricted-imports
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
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
assert<boolean>(isInferredBy(isB))

export function isN(u: unknown) {
    return typeof u === "number";
}
assert<number>(isInferredBy(isN))

export function isS(u: unknown) {
    return typeof u === "string";
}
assert<string>(isInferredBy(isS))

export function isBI(u: unknown) {
    return typeof u === "bigint";
}
assert<bigint>(isInferredBy(isBI))

function assert<T>({ i, o }: { i: (_: T) => void; o: () => T }) {
    i(o())
}

function isInferredBy<T>(_: (u: unknown) => u is T) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
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

    const code = [
        ...nodes.flatMap(n => [
            printer.printNode(ts.EmitHint.Unspecified, n.checkFunction, resultFile),
            printer.printNode(ts.EmitHint.Unspecified, checkChecker(n.name, n.type), resultFile),
            '',
        ]),
        checkerLib,
    ].join(ts.sys.newLine)

    assert.deepStrictEqual(
        typecheck(code, 'index.rt.ts').map(d => d.messageText),
        [],
    )

    return code
}

function checkChecker(name: ts.Identifier, type: ts.TypeNode) {
    const { factory } = ts
    return factory.createExpressionStatement(
        factory.createCallExpression(
            factory.createIdentifier('assert'),
            [type],
            [
                factory.createCallExpression(factory.createIdentifier('isInferredBy'), undefined, [
                    factory.createIdentifier('is' + name.escapedText),
                ]),
            ],
        ),
    )
}

const checkerLib = `
function assert<T>({ i, o }: { i: (_: T) => void; o: () => T }) {
    i(o())
}

function isInferredBy<T>(_: (u: unknown) => u is T) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
`.trim()

function typecheck(code: string, fileName: string) {
    const program = ts.createProgram(
        [fileName],
        {
            noEmit: true,
        },
        singleFileHost(code, fileName),
    )

    return ts.getPreEmitDiagnostics(program)
}

function singleFileHost(code: string, fileName: string): ts.CompilerHost {
    return {
        getSourceFile: (
            f: string,
            languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
            onError?: (message: string) => void,
        ) => {
            if (f === fileName) {
                return ts.createSourceFile(f, code, languageVersion)
            }
            if (f.startsWith('lib.')) {
                return ts.createSourceFile(
                    f,
                    readFileSync(
                        fileURLToPath(import.meta.resolve('typescript/lib/' + f)),
                        'utf-8',
                    ),
                    languageVersion,
                )
            }
            if (onError) {
                onError('File not found: ' + f)
            }
            return undefined
        },
        getDefaultLibFileName: () => 'lib.d.ts',
        writeFile: notImplemented('writeFile'),
        getCurrentDirectory: () => '.',
        getDirectories: notImplemented('getDirectories'),
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: f => f,
        getNewLine: () => ts.sys.newLine,
        fileExists: f => f === fileName,
        readFile: f => {
            if (f !== fileName) {
                return undefined
            }
            return code
        },
        resolveModuleNames: notImplemented('resolveModuleName'),
    }
}

const notImplemented = (what: string) => () => {
    throw new Error(what + ' not implemented')
}
