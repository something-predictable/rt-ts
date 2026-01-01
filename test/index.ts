import assert from 'node:assert/strict'
import { format } from 'prettier'
// eslint-disable-next-line no-restricted-imports
import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { create } from '../index.js'

const cases = await readdir('test/data/')

describe('emits ts', () => {
    for (const c of cases.filter(f => !f.endsWith('.rt.ts'))) {
        it(`handles ${c}`, async () => {
            const inputFile = `test/data/${c}`
            const outputFile = `${inputFile.slice(0, -3)}.rt.ts`
            const expected = await readFile(outputFile, 'utf-8')

            try {
                assert.deepStrictEqual(
                    await print(
                        c,
                        create(
                            ts.createSourceFile(c, await readFile(inputFile, 'utf-8'), {
                                languageVersion: ts.ScriptTarget.ES2024,
                            }),
                        ),
                    ),
                    expected,
                )
            } catch (e) {
                const { message, type } = e as { message: string; type?: ts.TypeNode }
                if (type) {
                    assert.fail(`${message} Kind: ${ts.SyntaxKind[type.kind]}`)
                }
                throw e
            }
        })
    }
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
            checkFunction: ts.FunctionDeclaration
        }[]
        library: ts.FunctionDeclaration[]
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
        ...nodes.flatMap(n => [
            printer.printNode(ts.EmitHint.Unspecified, n.checkFunction, resultFile),
            printer.printNode(ts.EmitHint.Unspecified, checkChecker(n.name, n.type), resultFile),
            '',
        ]),
        ...library.map(n => printer.printNode(ts.EmitHint.Unspecified, n, resultFile)),
        '',
        checkerLib,
    ].join(ts.sys.newLine)

    assert.deepStrictEqual(
        typecheck(code, fileName).map(d => d.messageText),
        [],
        `Type checking this code: \n${code}`,
    )

    return await format(code, {
        parser: 'typescript',
        tabWidth: 4,
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
