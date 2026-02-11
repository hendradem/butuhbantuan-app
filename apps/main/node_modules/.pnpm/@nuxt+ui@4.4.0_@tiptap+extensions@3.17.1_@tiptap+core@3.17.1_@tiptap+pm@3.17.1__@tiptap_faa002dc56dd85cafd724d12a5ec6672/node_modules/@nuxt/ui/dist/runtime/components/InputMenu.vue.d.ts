import type { ComboboxRootProps, ComboboxRootEmits, ComboboxContentProps, ComboboxContentEmits, ComboboxArrowProps } from 'reka-ui';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/input-menu';
import type { UseComponentIconsProps } from '../composables/useComponentIcons';
import type { AvatarProps, ButtonProps, ChipProps, IconProps, LinkPropsKeys } from '../types';
import type { ModelModifiers } from '../types/input';
import type { InputHTMLAttributes } from '../types/html';
import type { AcceptableValue, ArrayOrNested, GetItemKeys, GetModelValue, GetModelValueEmits, NestedItem, EmitsToProps } from '../types/utils';
import type { ComponentConfig } from '../types/tv';
type InputMenu = ComponentConfig<typeof theme, AppConfig, 'inputMenu'>;
export type InputMenuValue = AcceptableValue;
export type InputMenuItem = InputMenuValue | {
    label?: string;
    description?: string;
    /**
     * @IconifyIcon
     */
    icon?: IconProps['name'];
    avatar?: AvatarProps;
    chip?: ChipProps;
    /**
     * The item type.
     * @defaultValue 'item'
     */
    type?: 'label' | 'separator' | 'item';
    disabled?: boolean;
    onSelect?: (e: Event) => void;
    class?: any;
    ui?: Pick<InputMenu['slots'], 'tagsItem' | 'tagsItemText' | 'tagsItemDelete' | 'tagsItemDeleteIcon' | 'label' | 'separator' | 'item' | 'itemLeadingIcon' | 'itemLeadingAvatarSize' | 'itemLeadingAvatar' | 'itemLeadingChip' | 'itemLeadingChipSize' | 'itemWrapper' | 'itemLabel' | 'itemDescription' | 'itemTrailing' | 'itemTrailingIcon'>;
    [key: string]: any;
};
export interface InputMenuProps<T extends ArrayOrNested<InputMenuItem> = ArrayOrNested<InputMenuItem>, VK extends GetItemKeys<T> | undefined = undefined, M extends boolean = false> extends Pick<ComboboxRootProps<T>, 'open' | 'defaultOpen' | 'disabled' | 'name' | 'resetSearchTermOnBlur' | 'resetSearchTermOnSelect' | 'resetModelValueOnClear' | 'highlightOnHover' | 'openOnClick' | 'openOnFocus' | 'by'>, UseComponentIconsProps, /** @vue-ignore */ Omit<InputHTMLAttributes, 'disabled' | 'name' | 'type' | 'placeholder' | 'autofocus' | 'maxlength' | 'minlength' | 'pattern' | 'size' | 'min' | 'max' | 'step'> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    id?: string;
    type?: InputHTMLAttributes['type'];
    /** The placeholder text when the input is empty. */
    placeholder?: string;
    /**
     * @defaultValue 'primary'
     */
    color?: InputMenu['variants']['color'];
    /**
     * @defaultValue 'outline'
     */
    variant?: InputMenu['variants']['variant'];
    /**
     * @defaultValue 'md'
     */
    size?: InputMenu['variants']['size'];
    required?: boolean;
    autofocus?: boolean;
    autofocusDelay?: number;
    /**
     * The icon displayed to open the menu.
     * @defaultValue appConfig.ui.icons.chevronDown
     * @IconifyIcon
     */
    trailingIcon?: IconProps['name'];
    /**
     * The icon displayed when an item is selected.
     * @defaultValue appConfig.ui.icons.check
     * @IconifyIcon
     */
    selectedIcon?: IconProps['name'];
    /**
     * The icon displayed to delete a tag.
     * Works only when `multiple` is `true`.
     * @defaultValue appConfig.ui.icons.close
     * @IconifyIcon
     */
    deleteIcon?: IconProps['name'];
    /**
     * Display a clear button to reset the model value.
     * Can be an object to pass additional props to the Button.
     * @defaultValue false
     */
    clear?: boolean | Partial<Omit<ButtonProps, LinkPropsKeys>>;
    /**
     * The icon displayed in the clear button.
     * @defaultValue appConfig.ui.icons.close
     * @IconifyIcon
     */
    clearIcon?: IconProps['name'];
    /**
     * The content of the menu.
     * @defaultValue { side: 'bottom', sideOffset: 8, collisionPadding: 8, position: 'popper' }
     */
    content?: Omit<ComboboxContentProps, 'as' | 'asChild' | 'forceMount'> & Partial<EmitsToProps<ComboboxContentEmits>>;
    /**
     * Display an arrow alongside the menu.
     * @defaultValue false
     */
    arrow?: boolean | Omit<ComboboxArrowProps, 'as' | 'asChild'>;
    /**
     * Render the menu in a portal.
     * @defaultValue true
     */
    portal?: boolean | string | HTMLElement;
    /**
     * Enable virtualization for large lists.
     * Note: when enabled, all groups are flattened into a single list due to a limitation of Reka UI (https://github.com/unovue/reka-ui/issues/1885).
     * @defaultValue false
     */
    virtualize?: boolean | {
        /**
         * Number of items rendered outside the visible area
         * @defaultValue 12
         */
        overscan?: number;
        /**
         * Estimated size (in px) of each item, or a function that returns the size for a given index
         * @defaultValue 32
         */
        estimateSize?: number | ((index: number) => number);
    };
    /**
     * When `items` is an array of objects, select the field to use as the value instead of the object itself.
     * @defaultValue undefined
     */
    valueKey?: VK;
    /**
     * When `items` is an array of objects, select the field to use as the label.
     * @defaultValue 'label'
     */
    labelKey?: GetItemKeys<T>;
    /**
     * When `items` is an array of objects, select the field to use as the description.
     * @defaultValue 'description'
     */
    descriptionKey?: GetItemKeys<T>;
    items?: T;
    /** The value of the InputMenu when initially rendered. Use when you do not need to control the state of the InputMenu. */
    defaultValue?: GetModelValue<T, VK, M>;
    /** The controlled value of the InputMenu. Can be binded-with with `v-model`. */
    modelValue?: GetModelValue<T, VK, M>;
    modelModifiers?: Omit<ModelModifiers<GetModelValue<T, VK, M>>, 'lazy'>;
    /** Whether multiple options can be selected or not. */
    multiple?: M & boolean;
    /** Highlight the ring color like a focus state. */
    highlight?: boolean;
    /**
     * Determines if custom user input that does not exist in options can be added.
     * @defaultValue false
     */
    createItem?: boolean | 'always' | {
        position?: 'top' | 'bottom';
        when?: 'empty' | 'always';
    };
    /**
     * Fields to filter items by.
     * @defaultValue [labelKey]
     */
    filterFields?: string[];
    /**
     * When `true`, disable the default filters, useful for custom filtering (useAsyncData, useFetch, etc.).
     * @defaultValue false
     */
    ignoreFilter?: boolean;
    class?: any;
    ui?: InputMenu['slots'];
}
export type InputMenuEmits<A extends ArrayOrNested<InputMenuItem>, VK extends GetItemKeys<A> | undefined, M extends boolean> = Pick<ComboboxRootEmits, 'update:open'> & {
    'change': [event: Event];
    'blur': [event: FocusEvent];
    'focus': [event: FocusEvent];
    'create': [item: string];
    'clear': [];
    /** Event handler when highlighted element changes. */
    'highlight': [
        payload: {
            ref: HTMLElement;
            value: GetModelValue<A, VK, M>;
        } | undefined
    ];
    'remove-tag': [item: GetModelValue<A, VK, M>];
} & GetModelValueEmits<A, VK, M>;
type SlotProps<T extends InputMenuItem> = (props: {
    item: T;
    index: number;
    ui: InputMenu['ui'];
}) => any;
export interface InputMenuSlots<A extends ArrayOrNested<InputMenuItem> = ArrayOrNested<InputMenuItem>, VK extends GetItemKeys<A> | undefined = undefined, M extends boolean = false, T extends NestedItem<A> = NestedItem<A>> {
    'leading'(props: {
        modelValue?: GetModelValue<A, VK, M>;
        open: boolean;
        ui: InputMenu['ui'];
    }): any;
    'trailing'(props: {
        modelValue?: GetModelValue<A, VK, M>;
        open: boolean;
        ui: InputMenu['ui'];
    }): any;
    'empty'(props: {
        searchTerm?: string;
    }): any;
    'item': SlotProps<T>;
    'item-leading': SlotProps<T>;
    'item-label'(props: {
        item: T;
        index: number;
    }): any;
    'item-description'(props: {
        item: T;
        index: number;
    }): any;
    'item-trailing': SlotProps<T>;
    'tags-item-text'(props: {
        item: T;
        index: number;
    }): any;
    'tags-item-delete': SlotProps<T>;
    'content-top': (props?: {}) => any;
    'content-bottom': (props?: {}) => any;
    'create-item-label'(props: {
        item: string;
    }): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: <T extends ArrayOrNested<InputMenuItem>, VK extends GetItemKeys<T> | undefined = undefined, M extends boolean = false>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<(InputMenuProps<T, VK, M> & {
        searchTerm?: string;
    }) & {
        onClear?: (() => any) | undefined;
        onBlur?: ((event: FocusEvent) => any) | undefined;
        onChange?: ((event: Event) => any) | undefined;
        onFocus?: ((event: FocusEvent) => any) | undefined;
        "onUpdate:open"?: ((value: boolean) => any) | undefined;
        onCreate?: ((item: string) => any) | undefined;
        "onUpdate:modelValue"?: ((value: GetModelValue<T, VK, M>) => any) | undefined;
        onHighlight?: ((payload: {
            ref: HTMLElement;
            value: GetModelValue<T, VK, M>;
        } | undefined) => any) | undefined;
        "onUpdate:searchTerm"?: ((value: string) => any) | undefined;
        "onRemove-tag"?: ((item: GetModelValue<T, VK, M>) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: import("vue").ShallowUnwrapRef<{
        inputRef: Readonly<import("vue").Ref<HTMLInputElement, HTMLInputElement>>;
        viewportRef: Readonly<import("vue").Ref<HTMLDivElement | null, HTMLDivElement | null>>;
    }>) => void;
    attrs: any;
    slots: InputMenuSlots<T, VK, M, NestedItem<T>>;
    emit: (((evt: "clear") => void) & ((evt: "blur", event: FocusEvent) => void) & ((evt: "change", event: Event) => void) & ((evt: "focus", event: FocusEvent) => void) & ((evt: "update:open", value: boolean) => void) & ((evt: "create", item: string) => void) & ((evt: "update:modelValue", value: GetModelValue<T, VK, M>) => void) & ((evt: "highlight", payload: {
        ref: HTMLElement;
        value: GetModelValue<T, VK, M>;
    } | undefined) => void) & ((evt: "remove-tag", item: GetModelValue<T, VK, M>) => void)) & ((evt: "update:searchTerm", value: string) => void);
}>) => import("vue").VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
