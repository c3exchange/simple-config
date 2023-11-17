import { BaseVar } from './base';
import { Value } from '../types';

// -----------------------------------------------------------------------------

type NumberValidator = (value: number, name: string) => number|Promise<number>;

export class NumberVar extends BaseVar {
	protected _min?: number;
	protected _max?: number;
	protected _mustBeInt: boolean;
	protected _validator?: NumberValidator;

	public static define(name: string) {
		return new NumberVar(name);
	}

	private constructor(name: string) {
		super(name);
		this._mustBeInt = false;
	}

	public getType(): string {
		return 'number';
	}

	public min(value: number): NumberVar {
		if (typeof value !== 'number' || isNaN(value)) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of min)');
		}
		if (typeof this._max !== 'undefined' && value > this._max) {
			throw new Error('Invalid variable definition for "' + this._name + '" (min > max)');
		}
		this._min = value;
		return this;
	}

	public max(value: number): NumberVar {
		if (typeof value !== 'number' || isNaN(value)) {
			throw new Error('Invalid variable definition for "' + this._name + '" (value of max)');
		}
		if (typeof this._min !== 'undefined' && value < this._min) {
			throw new Error('Invalid variable definition for "' + this._name + '" (max < min)');
		}
		this._max = value;
		return this;
	}

	public musBeInt(): NumberVar {
		this._mustBeInt = true;
		return this;
	}

	public required(): NumberVar {
		super.setRequired();
		return this;
	}

	public default(value: number): NumberVar {
		super.setDefault(value);
		return this;
	}

	public validator(fn: NumberValidator): NumberVar {
		this._validator = fn;
		return this;
	}

	public async parse(value: string) : Promise<Value> {
		const v = Number(value);
		if (Number.isNaN(v)) {
			throw new Error('Variable "' + this._name + '" does not contain a valid integer value');
		}
		if (this._mustBeInt) {
			if (!Number.isInteger(v)) {
				throw new Error('Variable "' + this._name + '" does not contain a valid numeric value');
			}
		}

		if (typeof this._min !== 'undefined') {
			if (v < this._min) {
				throw new Error('Variable "' + this._name + '" is less than ' + this._min.toFixed());
			}
		}
		if (typeof this._max !== 'undefined') {
			if (v > this._max) {
				throw new Error('Variable "' + this._name + '" is greater than ' + this._max.toFixed());
			}
		}

		if (!this._validator) {
			return v;
		}
		return this._validator(v, this._name);
	}
}
