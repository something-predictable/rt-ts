import assert from 'node:assert/strict'
import { format } from 'prettier'
// eslint-disable-next-line no-restricted-imports
import { readFileSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts, { SyntaxKind } from 'typescript'
import { create } from '../index.js'
import { assertIsUNS, assertIsUON, assertIsUOO } from './data/sets.rt.js'
import { assertIsOSS, assertIsT, assertIsTSS } from './data/simple-objects.rt.js'

const fileCases = await readdir('test/data/')

describe('emits ts', () => {
    for (const c of fileCases.filter(
        f => !f.endsWith('.js') && !f.endsWith('.d.ts') && !f.endsWith('.rt.ts'),
    )) {
        it(`handles ${c}`, async () => {
            const inputFile = `test/data/${c}`
            const outputFile = `${inputFile.slice(0, -3)}.rt.ts`
            const expected = await readFile(outputFile, 'utf-8')

            try {
                assert.deepStrictEqual(
                    await print(
                        `${c.slice(0, -3)}.rt.ts`,
                        create(
                            ts.createSourceFile(c, await readFile(inputFile, 'utf-8'), {
                                languageVersion: ts.ScriptTarget.ES2024,
                            }),
                        ),
                    ),
                    expected,
                )
            } catch (e) {
                const { message, node, stack } = e as {
                    message: string
                    stack: unknown
                    node?: { kind: SyntaxKind }
                }
                if (node) {
                    assert.fail(`${message} Kind: ${SyntaxKind[node.kind]}\n${stack}`)
                }
                throw e
            }
        })
    }
})

describe('errors', () => {
    it('reports correct issues', () => {
        const cases: [(u: unknown, what: string) => void, unknown, string[]][] = [
            [assertIsOSS, 3, ['testCase must be an object']],
            [assertIsOSS, {}, ['testCase must contain a']],
            [assertIsOSS, { a: 3 }, ['testCase.a must be a string']],
            [assertIsOSS, { a: '3' }, ['testCase must contain b']],
            [assertIsOSS, { a: '3', b: 3 }, ['testCase.b must be a string']],
            [assertIsOSS, { a: '3', b: '3' }, []],
            [assertIsT, 3, ['testCase must be an array']],
            [assertIsT, [], []],
            [assertIsTSS, 3, ['testCase must be an array']],
            [assertIsTSS, '3', ['testCase must be an array']],
            [assertIsTSS, {}, ['testCase must be an array']],
            [assertIsTSS, [3], ['testCase[0] must be a string']],
            [assertIsTSS, ['3'], ['testCase[1] must be a string']],
            [assertIsTSS, ['3', 3], ['testCase[1] must be a string']],
            [assertIsTSS, ['3', '3 '], []],
            [assertIsUNS, true, ['testCase must be a number, or testCase must be a string']],
            [assertIsUNS, '3', []],
            [assertIsUON, {}, ['testCase must contain a, or testCase must be a number']],
            [assertIsUON, { a: '3' }, ['testCase must contain b, or testCase must be a number']],
            [assertIsUON, { a: '3', b: 2 }, []],
            [assertIsUOO, { a: '3' }, ['testCase must contain b, or testCase must contain c']],
            [assertIsUOO, { a: '3', b: 1 }, []],
            [assertIsUOO, { a: '3', c: 1 }, []],
        ]
        for (const [fn, arg, expectedIssues] of cases) {
            try {
                fn(arg, 'testCase')
                assert.deepStrictEqual([], expectedIssues)
            } catch (e) {
                const { issues: actualIssues } = e as { issues: unknown }
                if (!Array.isArray(actualIssues)) {
                    throw e
                }
                assert.deepStrictEqual(
                    actualIssues,
                    expectedIssues,
                    `${fn.name}(${JSON.stringify(arg)})`,
                )
            }
        }
    })
})

async function print(
    fileName: string,
    {
        nodes,
        library,
    }: {
        nodes: {
            name: ts.Identifier
            type: ts.TypeNode
            checkFunction: ts.Statement
            assertFunction: ts.Statement
        }[]
        library: ts.DeclarationStatement[]
    },
) {
    const resultFile = ts.createSourceFile(
        fileName,
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
        '/* eslint-disable no-shadow */',
        '',
        ...nodes.flatMap(n => [
            printer.printNode(ts.EmitHint.Unspecified, n.checkFunction, resultFile),
            printer.printNode(ts.EmitHint.Unspecified, checkChecker(n.name, n.type), resultFile),
            '',
            printer.printNode(ts.EmitHint.Unspecified, n.assertFunction, resultFile),
            printer.printNode(ts.EmitHint.Unspecified, assertChecker(n.name, n.type), resultFile),
            '',
        ]),
        ...library.flatMap(n => [printer.printNode(ts.EmitHint.Unspecified, n, resultFile), '']),
        '',
        checkerLib,
    ].join(ts.sys.newLine)

    assert.deepStrictEqual(
        (await typecheck(code, fileName)).map(d => d.messageText),
        [],
        `Type checking this code: \n${code}`,
    )

    return await format(code, {
        parser: 'typescript',
        tabWidth: 4,
        printWidth: 100,
        trailingComma: 'all',
        semi: false,
        singleQuote: true,
        arrowParens: 'avoid',
    })
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

function assertChecker(name: ts.Identifier, type: ts.TypeNode) {
    const { factory } = ts
    return factory.createExpressionStatement(
        factory.createCallExpression(
            factory.createIdentifier('assert'),
            [type],
            [
                factory.createCallExpression(factory.createIdentifier('isAssertedBy'), undefined, [
                    factory.createIdentifier('assertIs' + name.escapedText),
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

function isAssertedBy<T>(
    _: (u: unknown, what: string | undefined, error: (issues: string[]) => Error) => asserts u is T,
) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
`.trim()

async function typecheck(code: string, fileName: string) {
    const output: { [file: string]: string } = {}
    const program = ts.createProgram(
        [fileName],
        {
            module: ts.ModuleKind.ES2022,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            declaration: true,
            strict: true,
            alwaysStrict: true,
            allowUnreachableCode: false,
            allowUnusedLabels: false,
            noFallthroughCasesInSwitch: true,
            noImplicitAny: true,
            noImplicitReturns: true,
            noImplicitThis: true,
            noUncheckedIndexedAccess: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
        },
        singleFileHost(code, fileName, output),
    )

    program.emit()
    for (const [f, c] of Object.entries(output)) {
        await writeFile(`test/data/${f}`, c, 'utf-8')
    }

    return ts.getPreEmitDiagnostics(program)
}

function singleFileHost(
    code: string,
    fileName: string,
    output: { [file: string]: string },
): ts.CompilerHost {
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
        getDefaultLibFileName: () => 'lib.es2015.d.ts',
        writeFile: (f, text) => {
            output[f] = text
        },
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
