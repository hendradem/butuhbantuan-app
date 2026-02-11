import type { ComponentPublicInstance } from 'vue';
import type { TimeFieldRootProps, TimeFieldRootEmits } from 'reka-ui';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/input-time';
import type { UseComponentIconsProps } from '../composables/useComponentIcons';
import type { ComponentConfig } from '../types/tv';
type InputTime = ComponentConfig<typeof theme, AppConfig, 'inputTime'>;
export interface InputTimeProps extends Omit<TimeFieldRootProps, 'as' | 'asChild' | 'locale' | 'dir'>, UseComponentIconsProps {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    /**
     * @defaultValue 'primary'
     */
    color?: InputTime['variants']['color'];
    /**
     * @defaultValue 'outline'
     */
    variant?: InputTime['variants']['variant'];
    /**
     * @defaultValue 'md'
     */
    size?: InputTime['variants']['size'];
    /** Highlight the ring color like a focus state. */
    highlight?: boolean;
    autofocus?: boolean;
    autofocusDelay?: number;
    class?: any;
    ui?: InputTime['slots'];
}
export interface InputTimeEmits extends TimeFieldRootEmits {
    change: [event: Event];
    blur: [event: FocusEvent];
    focus: [event: FocusEvent];
}
export interface InputTimeSlots {
    leading(props: {
        ui: InputTime['ui'];
    }): any;
    default(props: {
        ui: InputTime['ui'];
    }): any;
    trailing(props: {
        ui: InputTime['ui'];
    }): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<InputTimeProps, {
    inputsRef: import("vue").Ref<ComponentPublicInstance[], ComponentPublicInstance[]>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    blur: (event: FocusEvent) => any;
    change: (event: Event) => any;
    focus: (event: FocusEvent) => any;
    "update:modelValue": (date: (import("@internationalized/date").CalendarDateTime | import("@internationalized/date").ZonedDateTime | import("@internationalized/date").Time) | undefined) => any;
    "update:placeholder": (date: import("@internationalized/date").CalendarDateTime | import("@internationalized/date").ZonedDateTime | import("@internationalized/date").Time) => any;
}, string, import("vue").PublicProps, Readonly<InputTimeProps> & Readonly<{
    onBlur?: ((event: FocusEvent) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((date: (import("@internationalized/date").CalendarDateTime | import("@internationalized/date").ZonedDateTime | import("@internationalized/date").Time) | undefined) => any) | undefined;
    "onUpdate:placeholder"?: ((date: import("@internationalized/date").CalendarDateTime | import("@internationalized/date").ZonedDateTime | import("@internationalized/date").Time) => any) | undefined;
}>, {
    autofocusDelay: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, InputTimeSlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
