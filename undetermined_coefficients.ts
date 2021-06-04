import math, { MathNode, simplify, parse } from 'mathjs';

import { equal, derivatives, derive, expand, isConstant } from './utils';

const internalVariableString = '___internal_variable_do_not_use___';

function injectVariables(
    func: MathNode,
    variables: Set<string> = new Set()
): [MathNode, Set<string>] {
    const newVariable = () => {
        let name;
        do {
            name = `___internal_variable_do_not_use__$__${
                Math.random() * 10000
            }`;
        } while (variables.has(name));
        variables.add(name);
        return name;
    };
    switch (func.type) {
        case 'ConstantNode':
            return newVariable();
        case 'OperatorNode':
            switch (func.fn) {
                case '+':
                case '-':
                case '*':
                    func.args.push(newVariable());
                case '/':
                case '':
                    func.args = func.args
                        .filter((n) => !isConstant(n))
                        .map((n) => {
                            const [node, vars] = injectVariables(n, variables);
                            for (const variable in vars.entries())
                                variables.add(variable);
                            return node;
                        });
                    return [func, variables];
            }
        case 'FunctionNode':
            switch (
                (typeof func.fn == 'string' && func.fn) ||
                (func.fn as any as MathNode).name
            ) {
                // Trig functions
                case 'sin':
                case 'cos':
                case 'tan':
                case 'csc':
                case 'sec':
                case 'cot':
                case 'asin':
                case 'acos':
                case 'atan':
                case 'acsc':
                case 'asec':
                case 'acot':
                // Logarithms
                case 'log':
                    const [node, vars] = injectVariables(
                        func.args[0],
                        variables
                    );
                    for (const variable in vars.entries())
                        variables.add(variable);
                    func.args[0] = parse(
                        `${newVariable()} * (${func.args[0].toString()})`
                    );
            }
    }
}

export default async function undetermined_coefficients(
    y: MathNode,
    f: MathNode,
    independentVariable: string = 'x',
    dependentVariable: string = 'y'
): Promise<MathNode> {
    f = simplify(f);
    /**
     * The particular solution.
     */
    let y_p = parse('a+b'); // This is used to get an addition node that I can repopulate with the derivatives.
    y_p.args = derivatives(f, independentVariable);
    y_p = expand(y_p);
    console.log(y_p.toString());
    let variables: Set<string>;
    [y_p, variables] = injectVariables(y_p);

    // Substiture y_p in for y.
    y = y.transform(function (node, path, parent) {
        if (node.isSymbolNode && node.name == dependentVariable) {
            return y_p.cloneDeep();
        } else {
            return node;
        }
    });

    // Create the function with calculated derivatives
    y = y.transform(function (node, path, parent) {
        if (
            node.isFunctionNode &&
            node.fn !== 'object' &&
            (node.fn as any).name === 'derive'
        ) {
            return derive(
                node.args[0],
                node.args[1].value,
                independentVariable
            );
        } else {
            return node;
        }
    });
    y = simplify(y);

    const coefficients = [];
    const values = [];
    console.log(y_p.toString());
    console.log(y.toString());
    console.log(f.toString());

    // Normalize f and y

    /**
     * Expects A tree with addition between parts in f and y.
     * Parts are divided into a constant multiplier or internal variable multiplier times some things that do not include internal variables.
     */
    // y.args.forEach((node) => {
    //     const p = f.filter((n) => equal)[0];
    //     let co = node.args[0].args;
    //     let ci = co.map((n) => parseInt(n.name.substring(34)));
    //     let coefficient = new Array(i);
    //     ci.forEach((val) => (coefficient[val] = 1));
    //     coefficients.push(coefficient);
    //     values.push(p.args[0]);
    // });

    // const solvedCoeff = lsolve(coefficients, values);

    // y = y.transform((node) => {
    //     if (
    //         node.isSymbolNode &&
    //         node.name.indexOf('___internal_variable_do_not_use___') == 0
    //     ) {
    //         return parse(`${solvedCoeff[parseInt(node.name.substring(34))]}`);
    //     } else {
    //         return node;
    //     }
    // });

    return simplify(y); // Make it pretty (the function is most likely very ugly at this point in time)
}
