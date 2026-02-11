import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/dashboard-navbar';
import type { DashboardContext } from '../utils/dashboard';
import type { ButtonProps, IconProps, LinkPropsKeys } from '../types';
import type { ComponentConfig } from '../types/tv';
type DashboardNavbar = ComponentConfig<typeof theme, AppConfig, 'dashboardNavbar'>;
export interface DashboardNavbarProps {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    /**
     * The icon displayed next to the title.
     * @IconifyIcon
     */
    icon?: IconProps['name'];
    title?: string;
    /**
     * Customize the toggle button to open the sidebar.
     * `{ color: 'neutral', variant: 'ghost' }`{lang="ts-type"}
     * @defaultValue true
     */
    toggle?: boolean | Omit<ButtonProps, LinkPropsKeys>;
    /**
     * The side to render the toggle button on.
     * @defaultValue 'left'
     */
    toggleSide?: 'left' | 'right';
    class?: any;
    ui?: DashboardNavbar['slots'];
}
type DashboardNavbarSlotsProps = Omit<DashboardContext, 'storage' | 'storageKey' | 'persistent' | 'unit'>;
export interface DashboardNavbarSlots {
    title(props?: {}): any;
    leading(props: DashboardNavbarSlotsProps & {
        ui: DashboardNavbar['ui'];
    }): any;
    trailing(props: DashboardNavbarSlotsProps & {
        ui: DashboardNavbar['ui'];
    }): any;
    left(props: DashboardNavbarSlotsProps): any;
    default(props: DashboardNavbarSlotsProps): any;
    right(props: DashboardNavbarSlotsProps): any;
    toggle(props: DashboardNavbarSlotsProps & {
        ui: DashboardNavbar['ui'];
    }): any;
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<DashboardNavbarProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<DashboardNavbarProps> & Readonly<{}>, {
    toggle: boolean | Omit<ButtonProps, LinkPropsKeys>;
    toggleSide: "left" | "right";
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, DashboardNavbarSlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
