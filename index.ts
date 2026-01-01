import ts, { SyntaxKind } from 'typescript'
import { Library } from './lib/std.js'

export function create(sourceFile: ts.SourceFile) {
    const nodes: {
        name: ts.Identifier
        type: ts.TypeNode
        checkFunction: ts.FunctionDeclaration
    }[] = []
    const { factory } = ts
    const lib = new Library(factory)
    ts.forEachChild(sourceFile, node => {
        if (!ts.isTypeAliasDeclaration(node)) {
            return
        }
        // eslint-disable-next-line no-bitwise
        if (!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) {
            return
        }
        const arg = factory.createIdentifier('u')
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
                    [
                        factory.createReturnStatement(
                            createTypeAssertionExpression(factory, lib, arg, node.type),
                        ),
                    ],
                    true,
                ),
            ),
        })
    })
    return {
        nodes,
        library: [...lib.nodes()],
    }
}

function createTypeAssertionExpression(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    type: ts.TypeNode,
) {
    switch (type.kind) {
        case SyntaxKind.UndefinedKeyword:
            return f.createBinaryExpression(
                identifier,
                f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                f.createIdentifier('undefined'),
            )
        case SyntaxKind.BooleanKeyword:
            return isTypeOf(f, identifier, 'boolean')
        case SyntaxKind.NumberKeyword:
            return isTypeOf(f, identifier, 'number')
        case SyntaxKind.BigIntKeyword:
            return isTypeOf(f, identifier, 'bigint')
        case SyntaxKind.StringKeyword:
            return isTypeOf(f, identifier, 'string')
        default:
            if (ts.isLiteralTypeNode(type)) {
                if (type.literal.kind === SyntaxKind.NullKeyword) {
                    return f.createBinaryExpression(
                        identifier,
                        f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                        f.createIdentifier('null'),
                    )
                }
            }
            if (ts.isTypeLiteralNode(type)) {
                return inferMembers(
                    f,
                    lib,
                    identifier,
                    f.createBinaryExpression(
                        isTypeOf(f, identifier, 'object'),
                        f.createToken(SyntaxKind.AmpersandAmpersandToken),
                        f.createBinaryExpression(
                            identifier,
                            f.createToken(SyntaxKind.ExclamationEqualsEqualsToken),
                            f.createIdentifier('null'),
                        ),
                    ),
                    type.members,
                    0,
                )
            }
            if (ts.isTupleTypeNode(type)) {
                return f.createBinaryExpression(
                    f.createCallExpression(
                        f.createPropertyAccessExpression(
                            f.createIdentifier('Array'),
                            f.createIdentifier('isArray'),
                        ),
                        undefined,
                        [identifier],
                    ),
                    f.createToken(SyntaxKind.AmpersandAmpersandToken),
                    lib.isEmptyTuple(identifier),
                )
            }
            throw Object.assign(new Error('Unsupported type.'), { node: type })
    }
}

function inferMembers(
    f: ts.NodeFactory,
    lib: Library,
    identifier: ts.Identifier,
    inner: ts.BinaryExpression,
    members: readonly ts.TypeElement[],
    ix: number,
) {
    if (ix === members.length) {
        return inner
    }
    const member = members[ix]
    if (!member) {
        throw new RangeError('Members out of bounds')
    }
    const { name, inferrer } = inferMember(f, lib, member)
    return inferMembers(
        f,
        lib,
        identifier,
        f.createBinaryExpression(
            inner,
            f.createToken(SyntaxKind.AmpersandAmpersandToken),
            f.createBinaryExpression(
                f.createBinaryExpression(name, f.createToken(ts.SyntaxKind.InKeyword), identifier),
                f.createToken(SyntaxKind.AmpersandAmpersandToken),
                lib.inferMember(identifier, name, inferrer),
            ),
        ),
        members,
        ix + 1,
    )
}

function inferMember(f: ts.NodeFactory, lib: Library, member: ts.TypeElement) {
    if (!member.name || !ts.isIdentifier(member.name)) {
        throw new Error('Object member needs a literal name')
    }
    if (ts.isPropertySignature(member)) {
        if (!member.type) {
            throw new Error('Object member needs a type')
        }
        const identifier = f.createIdentifier('u')
        return {
            name: f.createStringLiteral(member.name.text, true),
            inferrer: f.createArrowFunction(
                undefined,
                undefined,
                [f.createParameterDeclaration(undefined, undefined, identifier)],
                undefined,
                f.createToken(SyntaxKind.EqualsGreaterThanToken),
                createTypeAssertionExpression(f, lib, identifier, member.type),
            ),
        }
    } else {
        throw Object.assign(new Error('Unsupported member.'), { node: member })
    }
}

function isTypeOf(f: ts.NodeFactory, identifier: ts.Identifier, typeLiteral: string) {
    return f.createBinaryExpression(
        f.createTypeOfExpression(identifier),
        f.createToken(SyntaxKind.EqualsEqualsEqualsToken),
        f.createStringLiteral(typeLiteral),
    )
}
