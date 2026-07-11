import { eventHandler } from "h3";
import { useRuntimeConfig, useAppConfig } from "#imports";
import components from "#nuxt-component-meta/nitro";
import { collections, gitInfo, appConfigSchema } from "#content/preview";
export default eventHandler(async () => {
  const mappedComponents = Object.values(components).map(({ pascalName, filePath, meta }) => {
    return {
      name: pascalName,
      path: filePath,
      meta: {
        props: meta.props,
        slots: meta.slots,
        events: meta.events
      }
    };
  });
  const appConfig = useAppConfig();
  const runtimeConfig = useRuntimeConfig();
  const { content } = runtimeConfig;
  const { preview } = runtimeConfig.public;
  const { version } = content;
  return {
    version,
    preview,
    gitInfo,
    collections,
    appConfigSchema,
    appConfig,
    components: mappedComponents
  };
});
