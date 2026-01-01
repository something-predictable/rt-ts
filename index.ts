import ts, { SyntaxKind } from 'typescript'

export function create(sourceFile: ts.SourceFile) {
    const nodes: {
        name: ts.Identifier
        type: ts.TypeNode
        checkFunction: ts.FunctionDeclaration
    }[] = []
    const { factory } = ts
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
                [factory.createToken(ts.SyntaxKind.ExportKeyword)],
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
                        undefined,
                    ),
                ],
                undefined,
                factory.createBlock(
                    [
                        factory.createReturnStatement(
                            createTypeAssertionExpression(factory, arg, node.type),
                        ),
                    ],
                    true,
                ),
            ),
        })
    })
    return nodes
}

function createTypeAssertionExpression(
    f: ts.NodeFactory,
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
            throw Object.assign(new Error('Unsupported type.'), { type })
    }
}

function isTypeOf(f: ts.NodeFactory, identifier: ts.Identifier, typeLiteral: string) {
    return f.createBinaryExpression(
        f.createTypeOfExpression(identifier),
        f.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
        f.createStringLiteral(typeLiteral),
    )
}
