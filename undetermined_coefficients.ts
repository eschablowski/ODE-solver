import * as math from 'mathjs';
import { simplify } from 'mathjs';

import { derivatives, derive, expand, isConstant } from './utils';

const internalVariableString = '___internal_variable__DO_NOT_USE_____';

function injectVariables(
    func: math.MathNode,
    variables: Set<string> = new Set()
): [math.MathNode, Set<string>] {
    const newVariable = () => {
        let name: string;
        do {
            name = internalVariableString + Math.floor(Math.random() * 100000);
        } while (variables.has(name));
        variables.add(name);
        return name;
    };
    switch (func.type) {
        case 'ConstantNode':
            const name = newVariable();
            return [math.parse(name), variables];
        case 'OperatorNode':
            switch (func.op) {
                case '+':
                case '-':
                case '*':
                    func.args.push(math.parse(newVariable()));
                case '/':
                case '^':
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
                (func.fn as any as math.MathNode).name
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
                    func.args[0] = node;
                    for (const variable in vars.entries())
                        variables.add(variable);
                    func.args[0] = math.parse(
                        `${newVariable()} * (${func.args[0].toString()})`
                    );
                    return [func, variables];
            }
    }
    return [func, variables];
}

export default async function undetermined_coefficients(
    y: math.MathNode,
    f: math.MathNode,
    independentVariable: string = 'x',
    dependentVariable: string = 'y'
): Promise<math.MathNode> {
    f = math.simplify(f);
    /**
     * The particular solution.
     */
    let y_p_initial = math.parse('a+b'); // This is used to get an addition node that I can repopulate with the derivatives.
    y_p_initial.args = derivatives(f, independentVariable);
    y_p_initial = expand(y_p_initial);
    let [y_p, variables] = injectVariables(y_p_initial);

    // Substiture y_p in for y.
    y = y.transform(function (node) {
        if (node.isSymbolNode && node.name == dependentVariable) {
            return y_p.cloneDeep();
        } else {
            return node;
        }
    });

    // Create the function with calculated derivatives
    y = y.transform(function (node) {
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
    y = math.simplify(y);

    const equations: math.MathNode[] = [];

    let solvingEquation = math.parse(`${f.toString()} == ${y.toString()}`);
    for (const _ of variables) {
        const value = Math.floor(Math.random() * 100); // Just get a good value somewhere
        equations.push(
            solvingEquation.transform((node) => {
                if (node.isSymbolNode && node.name == independentVariable) {
                    return math.parse(`${value}`);
                }
                return node;
            })
        );
    }
    const varArray = [...variables];
    const solutionArray: number[] = [];
    const coeffMatrix = equations.map((equation) => {
        const coeff: number[] = new Array(varArray.length).fill(0);
        solutionArray.push(equation.args[0].evaluate());
        expand(equation.args[1]).forEach(function coeffFinder(node) {
            if (node.isOperatorNode && node.op == '+')
                return node.forEach(coeffFinder);
            if (node.isOperatorNode && node.op == '*') {
                if (node.args[0].isConstantNode)
                    return (coeff[varArray.indexOf(node.args[1].name)] =
                        node.args[0].value);
                else if (node.args[1].isConstantNode)
                    return (coeff[varArray.indexOf(node.args[0].name)] =
                        node.args[1].value);
            } else if (node.isSymbolNode && variables.has(node.name)) {
                return (coeff[varArray.indexOf(node.name)] = 1);
            }
            console.log(node);
            throw new Error('Currently Unsolvable format, aborting...');
        });
        return coeff;
    });
    const solvedValues: number[] = math
        .lusolve(coeffMatrix, solutionArray)
        .map((val) => val[0] as number) as number[];
    y_p = y_p.transform((node) => {
        if (node.isSymbolNode && variables.has(node.name)) {
            return math.parse(
                `${solvedValues[varArray.indexOf(node.name)]}` // Get the value for the variable
            );
        }
        return node;
    });

    return math.simplify(y_p); // Make it pretty (the function is most likely very ugly at this point in time)
}
