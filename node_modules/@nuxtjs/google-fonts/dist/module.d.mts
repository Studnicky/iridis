import * as _nuxt_schema from '@nuxt/schema';
import { DownloadOptions, GoogleFonts } from 'google-fonts-helper';

interface ModuleOptions extends Partial<DownloadOptions>, GoogleFonts {
    prefetch?: boolean;
    preconnect?: boolean;
    preload?: boolean;
    useStylesheet?: boolean;
    download?: boolean;
    inject?: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions>;

export { type ModuleOptions, _default as default };
