import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/page-cta';
import type { ButtonProps } from '../types';
import type { ComponentConfig } from '../types/tv';
type PageCTA = ComponentConfig<typeof theme, AppConfig, 'pageCTA'>;
export interface PageCTAProps {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    class?: any;
    title?: string;
    description?: string;
    /**
     * The orientation of the page cta.
     * @defaultValue 'vertical'
     */
    orientation?: PageCTA['variants']['orientation'];
    /**
     * Reverse the order of the default slot.
     * @defaultValue false
     */
    reverse?: boolean;
    /**
     * @defaultValue 'outline'
     */
    variant?: PageCTA['variants']['variant'];
    /**
     * Display a list of Button under the description.
     * `{ size: 'lg' }`{lang="ts-type"}
     */
    links?: ButtonProps[];
    ui?: PageCTA['slots'];
}
export interface PageCTASlots {
    top(props?: {}): any;
    header(props?: {}): any;
    title(props?: {}): any;
    description(props?: {}): any;
    body(props?: {}): any;
    footer(props?: {}): any;
    links(props?: {}): any;
    default(props?: {}): any;
    bottom(props?: {}): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<PageCTAProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<PageCTAProps> & Readonly<{}>, {
    reverse: boolean;
    orientation: PageCTA["variants"]["orientation"];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, PageCTASlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
