<script setup>
import { onMounted, ref, onUnmounted } from "vue";
import { useCookie, useNuxtApp, useRouter } from "#app";
const props = defineProps({
  previewToken: {
    type: String,
    required: true
  },
  api: {
    type: String,
    required: true
  },
  initializePreview: {
    type: Function,
    required: true
  }
});
const previewClasses = ["__nuxt_preview", "__preview_enabled"];
const nuxtApp = useNuxtApp();
const router = useRouter();
const open = ref(true);
const refreshing = ref(false);
const previewReady = ref(false);
const error = ref("");
let socket;
const closePreviewMode = async () => {
  useCookie("previewToken").value = "";
  window.sessionStorage.removeItem("previewToken");
  window.sessionStorage.removeItem("previewAPI");
  await router.replace({ query: { preview: void 0 } });
  window.location.reload();
};
const init = async (data) => {
  await props.initializePreview(data);
  if (!useCookie("previewToken").value) {
    return;
  }
  previewReady.value = true;
  await router.replace({ query: {} });
  nuxtApp.callHook("nuxt-content:preview:ready");
  if (window.parent && window.self !== window.parent) {
    socket.disconnect();
  }
};
onMounted(async () => {
  const io = await import("socket.io-client");
  socket = io.connect(`${props.api}/preview`, {
    transports: ["websocket", "polling"],
    auth: {
      token: props.previewToken
    }
  });
  let syncTimeout;
  socket.on("connect", () => {
    syncTimeout = setTimeout(() => {
      if (!previewReady.value) {
        syncTimeout = setTimeout(() => {
          error.value = "Preview sync timed out";
          previewReady.value = false;
        }, 3e4);
        socket.emit("draft:requestSync");
      }
    }, 3e4);
  });
  const clearSyncTimeout = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
  };
  socket.on("draft:sync", async (data) => {
    clearSyncTimeout();
    if (!data) {
      try {
        socket.once("draft:ready", () => {
          socket.emit("draft:requestSync");
        });
        await $fetch("api/projects/preview/sync", {
          baseURL: props.api,
          method: "POST",
          params: {
            token: props.previewToken
          }
        });
      } catch (e) {
        clearSyncTimeout();
        switch (e.response.status) {
          case 404:
            error.value = "Preview draft not found";
            previewReady.value = false;
            break;
          default:
            error.value = "An error occurred while syncing preview";
            previewReady.value = false;
        }
      }
      return;
    }
    init(data);
  });
  socket.on("draft:unauthorized", () => {
    clearSyncTimeout();
    error.value = "Unauthorized preview";
    previewReady.value = false;
  });
  socket.on("disconnect", () => {
    clearSyncTimeout();
  });
  document.body.classList.add(...previewClasses);
});
onUnmounted(() => {
  document.body.classList.remove(...previewClasses);
});
</script>

<template>
  <div>
    <div
      v-if="open"
      id="__nuxt_preview"
      :class="{ __preview_ready: previewReady, __preview_refreshing: refreshing }"
    >
      <template v-if="previewReady">
        <svg
          viewBox="0 0 90 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50.0016 71.0999h29.2561c.9293.0001 1.8422-.241 2.6469-.6992.8047-.4582 1.4729-1.1173 1.9373-1.9109.4645-.7936.7088-1.6939.7083-2.6102-.0004-.9162-.2455-1.8163-.7106-2.6095L64.192 29.713c-.4644-.7934-1.1325-1.4523-1.937-1.9105-.8046-.4581-1.7173-.6993-2.6463-.6993-.9291 0-1.8418.2412-2.6463.6993-.8046.4582-1.4726 1.1171-1.937 1.9105l-5.0238 8.5861-9.8224-16.7898c-.4648-.7934-1.1332-1.4522-1.938-1.9102-.8047-.4581-1.7176-.6992-2.6468-.6992-.9292 0-1.842.2411-2.6468.6992-.8048.458-1.4731 1.1168-1.9379 1.9102L6.56062 63.2701c-.46512.7932-.71021 1.6933-.71061 2.6095-.00041.9163.24389 1.8166.70831 2.6102.46443.7936 1.1326 1.4527 1.93732 1.9109.80473.4582 1.71766.6993 2.64686.6992h18.3646c7.2763 0 12.6422-3.1516 16.3345-9.3002l8.9642-15.3081 4.8015-8.1925 14.4099 24.6083H54.8058l-4.8042 8.1925ZM29.2077 62.899l-12.8161-.0028L35.603 30.0869l9.5857 16.4047-6.418 10.9645c-2.4521 3.9894-5.2377 5.4429-9.563 5.4429Z"
            fill="currentColor"
          />
        </svg>
        <span>Preview enabled</span>
        <button @click="closePreviewMode">
          Close
        </button>
      </template>
    </div>
    <Transition name="preview-loading">
      <div v-if="open && !previewReady && !error">
        <div id="__preview_background" />
        <div id="__preview_loader">
          <svg
            id="__preview_loading_icon"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
            />
          </svg>
          <p>Initializing the preview...</p>
          <button @click="closePreviewMode">
            Cancel
          </button>
        </div>
      </div>
    </Transition>
    <Transition name="preview-loading">
      <div v-if="error">
        <div id="__preview_background" />
        <div id="__preview_loader">
          <p>{{ error }}</p>
          <button @click="closePreviewMode">
            Exit preview
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
body.__preview_enabled{padding-bottom:50px}
</style>

<style scoped>
#__nuxt_preview{align-items:center;backdrop-filter:blur(20px);background:hsla(0,0%,100%,.3);border-top:1px solid #eee;bottom:-60px;color:#000;display:flex;font-family:Helvetica,sans-serif;font-size:16px;font-weight:500;gap:10px;height:50px;justify-content:center;left:0;position:fixed;right:0;transition:bottom .3s ease-in-out;z-index:10000}#__nuxt_preview.__preview_ready{bottom:0}#__preview_background{backdrop-filter:blur(8px);background:hsla(0,0%,100%,.3);height:100vh;left:0;position:fixed;top:0;width:100vw;z-index:9000}#__preview_loader{align-items:center;color:#000;display:flex;flex-direction:column;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;font-size:1.4rem;gap:8px;left:50%;position:fixed;top:50%;transform:translate(-50%,-50%);z-index:9500}#__preview_loader p{margin:10px 0}.dark #__preview_background,.dark-mode #__preview_background{background:rgba(0,0,0,.3)}.dark #__preview_loader,.dark-mode #__preview_loader{color:#fff}.preview-loading-enter-active,.preview-loading-leave-active{transition:opacity .4s}.preview-loading-enter,.preview-loading-leave-to{opacity:0}#__preview_loading_icon{animation:spin 1s linear infinite}.dark #__nuxt_preview,.dark-mode #__nuxt_preview{background:rgba(0,0,0,.3);border-top:1px solid #111;color:#fff}#__nuxt_preview svg{color:#000;display:inline-block;height:30px;width:30px}.dark #__nuxt_preview svg,.dark-mode #__nuxt_preview svg{color:#fff}button{background:transparent;border:1px solid rgba(0,0,0,.2);border-radius:3px;box-shadow:none;color:rgba(0,0,0,.8);cursor:pointer;display:inline-block;font-size:14px;font-weight:400;line-height:1rem;margin:0;padding:4px 10px;text-align:center;transition:none;width:auto}button:hover{border-color:rgba(0,0,0,.4);color:rgba(0,0,0,.9)}.dark button,.dark-mode button{border-color:hsla(0,0%,100%,.2);color:#d3d3d3}.dark button:hover,.dark-mode button:hover{border-color:hsla(0,0%,100%,.4);color:#fff}#__nuxt_preview button:focus,#__nuxt_preview button:hover{background:rgba(0,0,0,.1)}#__nuxt_preview button:active{background:rgba(0,0,0,.2)}.dark #__nuxt_preview button,.dark-mode #__nuxt_preview button{border:1px solid hsla(0,0%,100%,.2);color:hsla(0,0%,100%,.8)}.dark #__nuxt_preview button:hover,.dark-mode #__nuxt_preview button:focus{background:hsla(0,0%,100%,.1)}.dark #__nuxt_preview button:active,.dark-mode #__nuxt_preview button:active{background:hsla(0,0%,100%,.2)}a{font-weight:600}#__nuxt_preview.__preview_refreshing button,#__nuxt_preview.__preview_refreshing span,#__nuxt_preview.__preview_refreshing svg{animation:nuxt_pulsate 1s ease-out;animation-iteration-count:infinite;opacity:.5}@keyframes nuxt_pulsate{0%{opacity:1}50%{opacity:.5}to{opacity:1}}@keyframes spin{0%{transform:rotate(1turn)}to{transform:rotate(0deg)}}
</style>
