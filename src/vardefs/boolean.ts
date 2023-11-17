import { BaseVar } from './base';
import { Value } from '../types';
import { toBool } from '../util/bool';

// -----------------------------------------------------------------------------

export class BooleanVar extends BaseVar {
	public static define(name: string) {
		return new BooleanVar(name);
	}

	private constructor(name: string) {
		super(name);
	}

	public getType(): string {
		return 'bool';
	}

	public required(): BooleanVar {
		super.setRequired();
		return this;
	}

	public default(value: boolean): BooleanVar {
		super.setDefault(value);
		return this;
	}

	public parse(value: string) : Value {
		const b = toBool(value)
		if (typeof b === 'undefined') {
			throw new Error('Variable "' + this._name + '" does not contain a boolean value');
		}
		return b;
	}
}
