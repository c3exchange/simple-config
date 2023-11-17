import { Value } from '../types';

// -----------------------------------------------------------------------------

export abstract class BaseVar {
	protected _name: string;
	protected _required: boolean;
	protected _default?: Value;

	protected constructor(name: string) {
		if (typeof name !== 'string' || name.length < 0) {
			throw new Error('Invalid variable name');
		}
		this._name = name.toUpperCase();
		this._required = false;
	}

	public getName(): string {
		return this._name;
	}

	public isRequired(): boolean {
		return this._required;
	}

	public getDefault(): Value | undefined {
		return this._default;
	}

	protected setRequired() {
		this._required = true;
	}

	protected setDefault(value: Value) {
		this._default = value;
	}

	public abstract getType(): string;

	public abstract parse(value: string): Value | Promise<Value>;
}
