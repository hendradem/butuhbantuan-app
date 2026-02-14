import type { NumberFieldRootProps } from 'reka-ui';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/input-number';
import type { ButtonProps, IconProps, LinkPropsKeys } from '../types';
import type { InputHTMLAttributes } from '../types/html';
import type { ModelModifiers } from '../types/input';
import type { ComponentConfig } from '../types/tv';
type InputNumber = ComponentConfig<typeof theme, AppConfig, 'inputNumber'>;
type InputNumberValue = number | null;
export interface InputNumberProps<T extends InputNumberValue = InputNumberValue> extends Pick<NumberFieldRootProps, 'modelValue' | 'defaultValue' | 'min' | 'max' | 'step' | 'stepSnapping' | 'disabled' | 'required' | 'id' | 'name' | 'formatOptions' | 'disableWheelChange' | 'invertWheelChange' | 'readonly'>, /** @vue-ignore */ Omit<InputHTMLAttributes, 'disabled' | 'min' | 'max' | 'readonly' | 'required' | 'step' | 'name' | 'placeholder' | 'type' | 'autofocus' | 'maxlength' | 'minlength' | 'pattern' | 'size'> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    /** The placeholder text when the input is empty. */
    placeholder?: string;
    color?: InputNumber['variants']['color'];
    variant?: InputNumber['variants']['variant'];
    size?: InputNumber['variants']['size'];
    /** Highlight the ring color like a focus state. */
    highlight?: boolean;
    /**
     * The orientation of the input number.
     * @defaultValue 'horizontal'
     */
    orientation?: InputNumber['variants']['orientation'];
    /**
     * Configure the increment button. The `color` and `size` are inherited.
     * @defaultValue { variant: 'link' }
     */
    increment?: boolean | Omit<ButtonProps, LinkPropsKeys>;
    /**
     * The icon displayed to increment the value.
     * @defaultValue appConfig.ui.icons.plus
     * @IconifyIcon
     */
    incrementIcon?: IconProps['name'];
    /** Disable the increment button. */
    incrementDisabled?: boolean;
    /**
     * Configure the decrement button. The `color` and `size` are inherited.
     * @defaultValue { variant: 'link' }
     */
    decrement?: boolean | Omit<ButtonProps, LinkPropsKeys>;
    /**
     * The icon displayed to decrement the value.
     * @defaultValue appConfig.ui.icons.minus
     * @IconifyIcon
     */
    decrementIcon?: IconProps['name'];
    /** Disable the decrement button. */
    decrementDisabled?: boolean;
    autofocus?: boolean;
    autofocusDelay?: number;
    modelModifiers?: Pick<ModelModifiers<T>, 'optional'>;
    class?: any;
    ui?: InputNumber['slots'];
}
export interface InputNumberEmits<T extends InputNumberValue = InputNumberValue> {
    'update:modelValue': [value: T];
    'blur': [event: FocusEvent];
    'change': [event: Event];
}
export interface InputNumberSlots {
    increment(props?: {}): any;
    decrement(props?: {}): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: <T extends InputNumberValue = InputNumberValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<InputNumberProps<T> & {
        onBlur?: ((event: FocusEvent) => any) | undefined;
        onChange?: ((event: Event) => any) | undefined;
        "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: import("vue").ShallowUnwrapRef<{
        inputRef: Readonly<import("vue").Ref<HTMLInputElement, HTMLInputElement>>;
    }>) => void;
    attrs: any;
    slots: InputNumberSlots;
    emit: ((evt: "blur", event: FocusEvent) => void) & ((evt: "change", event: Event) => void) & ((evt: "update:modelValue", value: T) => void);
}>) => import("vue").VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
