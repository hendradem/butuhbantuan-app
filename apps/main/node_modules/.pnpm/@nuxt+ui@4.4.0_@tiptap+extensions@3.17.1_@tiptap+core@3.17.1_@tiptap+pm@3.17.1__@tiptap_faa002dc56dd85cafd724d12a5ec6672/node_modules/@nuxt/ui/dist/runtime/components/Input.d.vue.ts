import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/input';
import type { UseComponentIconsProps } from '../composables/useComponentIcons';
import type { InputHTMLAttributes } from '../types/html';
import type { ModelModifiers } from '../types/input';
import type { AcceptableValue } from '../types/utils';
import type { ComponentConfig } from '../types/tv';
type Input = ComponentConfig<typeof theme, AppConfig, 'input'>;
export type InputValue = AcceptableValue;
export interface InputProps<T extends InputValue = InputValue> extends UseComponentIconsProps, /** @vue-ignore */ Omit<InputHTMLAttributes, 'name' | 'type' | 'placeholder' | 'required' | 'autocomplete' | 'autofocus' | 'disabled'> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    id?: string;
    name?: string;
    type?: InputHTMLAttributes['type'];
    /** The placeholder text when the input is empty. */
    placeholder?: string;
    /**
     * @defaultValue 'primary'
     */
    color?: Input['variants']['color'];
    /**
     * @defaultValue 'outline'
     */
    variant?: Input['variants']['variant'];
    /**
     * @defaultValue 'md'
     */
    size?: Input['variants']['size'];
    required?: boolean;
    autocomplete?: InputHTMLAttributes['autocomplete'];
    autofocus?: boolean;
    autofocusDelay?: number;
    disabled?: boolean;
    /** Highlight the ring color like a focus state. */
    highlight?: boolean;
    modelValue?: T;
    defaultValue?: T;
    modelModifiers?: ModelModifiers<T>;
    class?: any;
    ui?: Input['slots'];
}
export interface InputEmits<T extends InputValue = InputValue> {
    'update:modelValue': [value: T];
    'blur': [event: FocusEvent];
    'change': [event: Event];
}
export interface InputSlots {
    leading(props: {
        ui: Input['ui'];
    }): any;
    default(props: {
        ui: Input['ui'];
    }): any;
    trailing(props: {
        ui: Input['ui'];
    }): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: <T extends InputValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<InputProps<T> & {
        onBlur?: ((event: FocusEvent) => any) | undefined;
        onChange?: ((event: Event) => any) | undefined;
        "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: import("vue").ShallowUnwrapRef<{
        inputRef: Readonly<import("vue").ShallowRef<HTMLInputElement | null, HTMLInputElement | null>>;
    }>) => void;
    attrs: any;
    slots: InputSlots;
    emit: ((evt: "blur", event: FocusEvent) => void) & ((evt: "change", event: Event) => void) & ((evt: "update:modelValue", value: T) => void);
}>) => import("vue").VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
