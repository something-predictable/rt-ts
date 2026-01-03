import ts, { SyntaxKind } from 'typescript'
import { Library } from './lib/std.js'

export function create(sourceFile: ts.SourceFile) {
    const nodes: {
        name: ts.Identifier
        type: ts.TypeNode
        checkFunction: ts.FunctionDeclaration
        assertFunction: ts.Statement
    }[] = []
    const { factory } = ts
    const lib = new Library(factory)
    const privateFunctions: ts.FunctionDeclaration[] = []
    ts.forEachChild(sourceFile, node => {
        if (!ts.isTypeAliasDeclaration(node)) {
            return
        }
        // eslint-disable-next-line no-bitwise
        if (!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) {
            return
        }
        const arg = factory.createIdentifier('u')
        const isWithErrors = factory.createIdentifier('is' + node.name.escapedText + 'WithErrors')
        const inferred = createTypeAssertionExpression(factory, lib, arg, node.type, undefined)
        nodes.push({
            name: node.name,
            type: node.type,
            checkFunction: factory.createFunctionDeclaration(
                [factory.createToken(SyntaxKind.ExportKeyword)],
                undefined,
                factory.createIdentifier('is' + node.name.escapedText),
                undefined,
                [
                    factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        arg,
                        undefined,
                        factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    ),
                ],
                undefined,
                factory.createBlock(
                    Array.isArray(inferred) ? inferred : [factory.createReturnStatement(inferred)],
                    true,
                ),
            ),
            assertFunction: factory.createVariableStatement(
                [factory.createToken(SyntaxKind.ExportKeyword)],
                factory.createVariableDeclarationList(
                    [
                        factory.createVariableDeclaration(
                            factory.createIdentifier('assertIs' + node.name.escapedText),
                            undefined,
                            undefined,
                            lib.makeAssertIs(isWithErrors),
                        ),
                    ],
                    ts.NodeFlags.Const,
                ),
            ),
        })
        const what = factory.createIdentifier('what')
        const errors = factory.createIdentifier('errors')
        const collectedInference = createTypeAssertionExpression(factory, lib, arg, node.type, {
            factory,
            lib,
            what,
            errors,
        })
        privateFunctions.push(
            factory.createFunctionDeclaration(
                undefined,
                undefined,
                isWithErrors,
                undefined,
                [
                    factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        arg,
                        undefined,
                        factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
                    ),
                    factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        what,
                        undefined,
                        factory.createUnionTypeNode([
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
                        ]),
                    ),
                    factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        errors,
                        undefined,
                        factory.createArrayTypeNode(
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                        ),
                    ),
                ],
                undefined,
                factory.createBlock(
                    Array.isArray(collectedInference)
                        ? collectedInference
                        : [factory.createReturnStatement(collectedInference)],
                    true,
                ),
            ),
        )
    })
    return {
        nodes,
        library: [...privateFunctions, ...lib.nodes()],
    }
}

type Collector = {
    factory: ts.NodeFactory
    lib: Library
    what: ts.Expression
    errors: ts.Expression
}

function createTypeAssertionExpression(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    type: ts.TypeNode,
    collector: Collector | undefined,
): ts.Expression | ts.Statement[] {
    switch (type.kind) {
        case SyntaxKind.UndefinedKeyword:
            return collect(
                identifier,
                i =>
                    f.createBinaryExpression(
                        i,
                        f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                        f.createIdentifier('undefined'),
                    ),
                'must be undefined',
                collector,
            )
        case SyntaxKind.BooleanKeyword:
            return collect(
                identifier,
                i => isTypeOf(f, i, 'boolean'),
                'must be a boolean',
                collector,
            )
        case SyntaxKind.NumberKeyword:
            return collect(identifier, i => isTypeOf(f, i, 'number'), 'must be a number', collector)
        case SyntaxKind.BigIntKeyword:
            return collect(identifier, i => isTypeOf(f, i, 'bigint'), 'must be a bigint', collector)
        case SyntaxKind.StringKeyword:
            return collect(identifier, i => isTypeOf(f, i, 'string'), 'must be a string', collector)
        default:
            if (ts.isLiteralTypeNode(type)) {
                if (type.literal.kind === SyntaxKind.NullKeyword) {
                    return collect(
                        identifier,
                        i =>
                            f.createBinaryExpression(
                                i,
                                f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                                f.createIdentifier('null'),
                            ),
                        'must be null',
                        collector,
                    )
                }
            }
            if (ts.isTypeLiteralNode(type)) {
                return inferObjectMembers(
                    f,
                    lib,
                    identifier,
                    f.createBinaryExpression(
                        collect(
                            identifier,
                            i => isTypeOf(f, i, 'object'),
                            'must be an object',
                            collector,
                        ),
                        f.createToken(SyntaxKind.AmpersandAmpersandToken),
                        collect(
                            identifier,
                            i =>
                                f.createBinaryExpression(
                                    i,
                                    f.createToken(SyntaxKind.ExclamationEqualsEqualsToken),
                                    f.createIdentifier('null'),
                                ),
                            'must not be null',
                            collector,
                        ),
                    ),
                    type.members,
                    0,
                    collector,
                )
            }
            if (ts.isTupleTypeNode(type)) {
                return inferTupleMembers(
                    f,
                    lib,
                    identifier,
                    collect(
                        identifier,
                        i =>
                            f.createCallExpression(
                                f.createPropertyAccessExpression(
                                    f.createIdentifier('Array'),
                                    f.createIdentifier('isArray'),
                                ),
                                undefined,
                                [i],
                            ),
                        'must be an array',
                        collector,
                    ),
                    type.elements,
                    0,
                    collector,
                )
            }
            if (ts.isUnionTypeNode(type)) {
                if (collector === undefined) {
                    return inferUnionMembers(f, lib, identifier, type.types, 0, undefined)
                }
                return inferUnionMembersWithCollector(f, lib, identifier, type.types, collector)
            }
            throw Object.assign(new Error('Unsupported type.'), { node: type })
    }
}

function createTypeAssertionFunction(
    f: ts.NodeFactory,
    identifier: ts.Identifier,
    typeAssertion: ts.Expression | ts.Statement[],
): ts.Expression & ts.FunctionLikeDeclarationBase {
    if (Array.isArray(typeAssertion)) {
        return f.createFunctionExpression(
            undefined,
            undefined,
            undefined,
            undefined,
            [f.createParameterDeclaration(undefined, undefined, identifier)],
            undefined,
            f.createBlock(typeAssertion),
        )
    }
    return f.createArrowFunction(
        undefined,
        undefined,
        [f.createParameterDeclaration(undefined, undefined, identifier)],
        undefined,
        f.createToken(SyntaxKind.EqualsGreaterThanToken),
        typeAssertion,
    )
}

function collect(
    identifier: ts.Identifier,
    exp: (i: ts.Identifier) => ts.Expression,
    error: string | ts.Expression,
    collector: Collector | undefined,
) {
    if (collector === undefined) {
        return exp(identifier)
    }
    const { factory, lib, what, errors } = collector
    const arg = factory.createIdentifier('v')
    return lib.collect(
        identifier,
        factory.createArrowFunction(
            undefined,
            undefined,
            [factory.createParameterDeclaration(undefined, undefined, arg)],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            exp(arg),
        ),
        errors,
        what,
        typeof error === 'string' ? factory.createStringLiteral(error) : error,
    )
}

function inferObjectMembers(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    inner: ts.BinaryExpression,
    members: readonly ts.TypeElement[],
    ix: number,
    collector: Collector | undefined,
) {
    if (ix === members.length) {
        return inner
    }
    const member = members[ix]
    if (!member) {
        throw new RangeError('Object members out of bounds')
    }
    const { name, inferrer } = inferObjectMember(f, lib, member, collector)
    return inferObjectMembers(
        f,
        lib,
        identifier,
        f.createBinaryExpression(
            inner,
            f.createToken(SyntaxKind.AmpersandAmpersandToken),
            f.createBinaryExpression(
                collect(
                    identifier,
                    i => f.createBinaryExpression(name, f.createToken(SyntaxKind.InKeyword), i),
                    f.createBinaryExpression(
                        f.createStringLiteral('must contain '),
                        f.createToken(SyntaxKind.PlusToken),
                        name,
                    ),
                    collector,
                ),
                f.createToken(SyntaxKind.AmpersandAmpersandToken),
                lib.inferObjectMember(identifier, name, inferrer),
            ),
        ),
        members,
        ix + 1,
        collector,
    )
}

function inferObjectMember(
    f: ts.NodeFactory,
    lib: Library,
    member: ts.TypeElement,
    collector: Collector | undefined,
) {
    if (!member.name || !ts.isIdentifier(member.name)) {
        throw new Error('Object member needs a literal name')
    }
    if (ts.isPropertySignature(member)) {
        if (!member.type) {
            throw new Error('Object member needs a type')
        }
        const identifier = f.createIdentifier('u')
        const name = f.createStringLiteral(member.name.text, true)
        return {
            name,
            inferrer: createTypeAssertionFunction(
                f,
                identifier,
                createTypeAssertionExpression(
                    f,
                    lib,
                    identifier,
                    member.type,
                    nested(collector, what => lib.memberAccess(what, name)),
                ),
            ),
        }
    } else {
        throw Object.assign(new Error('Unsupported member.'), { node: member })
    }
}

function inferTupleMembers(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    inner: ts.Expression,
    members: readonly (ts.TypeNode | ts.NamedTupleMember)[],
    ix: number,
    collector: Collector | undefined,
) {
    if (members.length === 0) {
        return f.createBinaryExpression(
            inner,
            f.createToken(SyntaxKind.AmpersandAmpersandToken),
            collect(identifier, i => lib.isEmptyTuple(i), 'must be empty', collector),
        )
    }
    const member = members[ix]
    if (!member) {
        throw new RangeError('Tuple members out of bounds')
    }
    if (!ts.isTypeNode(member)) {
        throw new Error('Tuple member needs a type')
    }

    const ixLiteral = f.createNumericLiteral(ix)
    const chain = f.createBinaryExpression(
        inner,
        f.createToken(SyntaxKind.AmpersandAmpersandToken),
        lib.inferTupleMember(
            identifier,
            f.createNumericLiteral(members.length),
            ixLiteral,
            createTypeAssertionFunction(
                f,
                identifier,
                createTypeAssertionExpression(
                    f,
                    lib,
                    identifier,
                    member,
                    nested(collector, what => lib.indexOf(what, ixLiteral)),
                ),
            ),
        ),
    )
    if (ix === members.length - 1) {
        return chain
    }
    return inferTupleMembers(f, lib, identifier, chain, members, ix + 1, collector)
}

function inferUnionMembersWithCollector(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    members: readonly ts.TypeNode[],
    collector: Collector,
): ts.Statement[] {
    const es = f.createIdentifier('es')
    const stringArrayType = f.createArrayTypeNode(f.createKeywordTypeNode(SyntaxKind.StringKeyword))
    const errorArraysType = f.createTupleTypeNode(members.map(() => stringArrayType))
    const branchCollectors = members.map((_, ix) => ({
        ...collector,
        errors: f.createElementAccessExpression(es, f.createNumericLiteral(ix)),
    }))
    const result = f.createIdentifier('i')
    return [
        f.createVariableStatement(
            undefined,
            f.createVariableDeclarationList(
                [
                    f.createVariableDeclaration(
                        es,
                        undefined,
                        errorArraysType,
                        f.createArrayLiteralExpression(
                            members.map(() => f.createArrayLiteralExpression([], false)),
                            false,
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),
        f.createVariableStatement(
            undefined,
            f.createVariableDeclarationList(
                [
                    f.createVariableDeclaration(
                        result,
                        undefined,
                        undefined,
                        inferUnionMembers(f, lib, identifier, members, 0, branchCollectors),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),
        f.createIfStatement(
            f.createPrefixUnaryExpression(SyntaxKind.ExclamationToken, result),
            f.createBlock([lib.createUnionErrorMessage(collector.errors, es)], true),
        ),
        f.createReturnStatement(result),
    ]
}

function inferUnionMembers(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    members: readonly ts.TypeNode[],
    ix: number,
    collector: Collector[] | undefined,
): ts.Expression {
    if (members.length === 0) {
        throw new Error('Union member list cannot be empty')
    }
    const member = members[ix]
    if (!member) {
        throw new RangeError('Union member out of bounds')
    }
    const branch = createTypeAssertionExpression(
        f,
        lib,
        identifier,
        member,
        Array.isArray(collector) ? collector[ix] : collector,
    )
    if (Array.isArray(branch)) {
        throw new TypeError('Union of unions not supported.')
    }
    if (ix === members.length - 1) {
        return branch
    }
    return f.createBinaryExpression(
        branch,
        f.createToken(SyntaxKind.BarBarToken),
        inferUnionMembers(f, lib, identifier, members, ix + 1, collector),
    )
}

function nested(
    collector: Collector | undefined,
    what: (w: ts.Expression) => ts.Expression,
): Collector | undefined {
    if (collector === undefined) {
        return undefined
    }
    return {
        ...collector,
        what: what(collector.what),
    }
}

function isTypeOf(f: ts.NodeFactory, identifier: ts.Identifier, typeLiteral: string) {
    return f.createBinaryExpression(
        f.createTypeOfExpression(identifier),
        f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
        f.createStringLiteral(typeLiteral),
    )
}
