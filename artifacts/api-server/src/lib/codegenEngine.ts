export interface GeneratedFile {
  filename: string;
  language: "java" | "kotlin" | "cpp" | "objc" | "swift" | "typescript";
  platform: "android" | "ios" | "shared";
  content: string;
}

function parseModuleInterface(spec: string, moduleName: string): {
  methods: Array<{ name: string; returnType: string; params: string }>;
  props: Array<{ name: string; type: string }>;
} {
  const methods: Array<{ name: string; returnType: string; params: string }> = [];
  const props: Array<{ name: string; type: string }> = [];

  const methodRegex = /(\w+)\s*\((.*?)\)\s*:\s*([\w<>,\s|]+)/g;
  let match;
  while ((match = methodRegex.exec(spec)) !== null) {
    const name = match[1];
    const params = match[2];
    const returnType = match[3].trim();
    if (name && name !== "interface" && name !== "type" && name !== "extends") {
      methods.push({ name, returnType, params });
    }
  }

  const propRegex = /(\w+)\s*:\s*([\w<>,\s|]+)\s*[;,]/g;
  while ((match = propRegex.exec(spec)) !== null) {
    const name = match[1];
    const type = match[2].trim();
    if (
      name &&
      !["interface", "type", "extends", "readonly", "const", "let", "var"].includes(name)
    ) {
      props.push({ name, type });
    }
  }

  return { methods, props };
}

function mapTypeToJava(tsType: string): string {
  const map: Record<string, string> = {
    string: "String",
    number: "double",
    boolean: "boolean",
    void: "void",
    "Promise<void>": "void",
    "Promise<string>": "Promise<String>",
    "Promise<number>": "Promise<Double>",
    "Promise<boolean>": "Promise<Boolean>",
  };
  return map[tsType] || "ReadableMap";
}

function mapTypeToCpp(tsType: string): string {
  const map: Record<string, string> = {
    string: "std::string",
    number: "double",
    boolean: "bool",
    void: "void",
    "Promise<void>": "AsyncPromise",
    "Promise<string>": "AsyncPromise",
    "Promise<number>": "AsyncPromise",
  };
  return map[tsType] || "jsi::Value";
}

export function generateNativeModuleFiles(
  moduleName: string,
  platform: "android" | "ios" | "both",
  spec: string,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { methods } = parseModuleInterface(spec, moduleName);

  if (platform === "android" || platform === "both") {
    const javaClass = `package com.${moduleName.toLowerCase()};

import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = ${moduleName}Module.NAME)
public class ${moduleName}Module extends NativeRN${moduleName}Spec {
    public static final String NAME = "${moduleName}";

    public ${moduleName}Module(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

${methods
  .map(
    (m) => `    @Override
    @ReactMethod
    public ${mapTypeToJava(m.returnType)} ${m.name}(${m.params ? `${m.params.split(",").map((p) => `String ${p.trim().split(":")[0]?.trim() ?? "arg"}`).join(", ")}, ` : ""}Promise promise) {
        // TODO: Implement ${m.name}
        promise.resolve(null);
    }
`,
  )
  .join("\n")}
}
`;
    files.push({
      filename: `${moduleName}Module.java`,
      language: "java",
      platform: "android",
      content: javaClass,
    });

    const packageClass = `package com.${moduleName.toLowerCase()};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ${moduleName}Package implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new ${moduleName}Module(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;
    files.push({
      filename: `${moduleName}Package.java`,
      language: "java",
      platform: "android",
      content: packageClass,
    });
  }

  if (platform === "ios" || platform === "both") {
    const objcHeader = `#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCT${moduleName} : NSObject <RCTBridgeModule>

${methods.map((m) => `- (void)${m.name}:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;`).join("\n")}

@end

NS_ASSUME_NONNULL_END
`;
    files.push({
      filename: `RCT${moduleName}.h`,
      language: "objc",
      platform: "ios",
      content: objcHeader,
    });

    const objcImpl = `#import "RCT${moduleName}.h"

@implementation RCT${moduleName}

RCT_EXPORT_MODULE(${moduleName});

${methods
  .map(
    (m) => `RCT_EXPORT_METHOD(${m.name}:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    // TODO: Implement ${m.name}
    resolve(nil);
}
`,
  )
  .join("\n")}
@end
`;
    files.push({
      filename: `RCT${moduleName}.mm`,
      language: "objc",
      platform: "ios",
      content: objcImpl,
    });
  }

  const tsModule = `import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
${methods.map((m) => `  ${m.name}(${m.params}): ${m.returnType};`).join("\n")}
}

export default TurboModuleRegistry.getEnforcing<Spec>('${moduleName}');
`;
  files.push({
    filename: `Native${moduleName}.ts`,
    language: "typescript",
    platform: "shared",
    content: tsModule,
  });

  const cppHeader = `#pragma once

#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

class JSI_EXPORT Native${moduleName}SpecJSI : public TurboModule {
public:
    Native${moduleName}SpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

${methods.map((m) => `    virtual ${mapTypeToCpp(m.returnType)} ${m.name}(jsi::Runtime& rt${m.params ? `, ${m.params}` : ""}) = 0;`).join("\n")}
};

} // namespace facebook::react
`;
  files.push({
    filename: `Native${moduleName}Spec.h`,
    language: "cpp",
    platform: "shared",
    content: cppHeader,
  });

  return files;
}

export function generateNativeComponentFiles(
  componentName: string,
  platform: "android" | "ios" | "both",
  spec: string,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { props } = parseModuleInterface(spec, componentName);

  const tsSpec = `import type {ViewProps} from 'react-native';
import type {HostComponent} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
${props.map((p) => `  ${p.name}: ${p.type};`).join("\n")}
}

export default codegenNativeComponent<NativeProps>('${componentName}') as HostComponent<NativeProps>;
`;
  files.push({
    filename: `${componentName}NativeComponent.ts`,
    language: "typescript",
    platform: "shared",
    content: tsSpec,
  });

  if (platform === "android" || platform === "both") {
    const javaViewManager = `package com.${componentName.toLowerCase()};

import android.content.Context;
import android.view.View;
import androidx.annotation.NonNull;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class ${componentName}Manager extends SimpleViewManager<View> {
    public static final String REACT_CLASS = "${componentName}";

    @Override
    @NonNull
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    @NonNull
    public View createViewInstance(@NonNull ThemedReactContext context) {
        return new View(context);
    }

${props
  .map(
    (p) => `    @ReactProp(name = "${p.name}")
    public void set${p.name.charAt(0).toUpperCase() + p.name.slice(1)}(View view, ${mapTypeToJava(p.type)} value) {
        // TODO: Implement ${p.name} setter
    }
`,
  )
  .join("\n")}
}
`;
    files.push({
      filename: `${componentName}Manager.java`,
      language: "java",
      platform: "android",
      content: javaViewManager,
    });
  }

  if (platform === "ios" || platform === "both") {
    const objcHeader = `#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

@interface ${componentName}View : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
`;
    files.push({
      filename: `${componentName}View.h`,
      language: "objc",
      platform: "ios",
      content: objcHeader,
    });

    const objcImpl = `#import "${componentName}View.h"
#import <react/renderer/components/${componentName.toLowerCase()}/${componentName}ComponentDescriptor.h>
#import <react/renderer/components/${componentName.toLowerCase()}/Props.h>

@implementation ${componentName}View

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<${componentName}ComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared&)props oldProps:(const Props::Shared&)oldProps
{
    const auto &newProps = *std::static_pointer_cast<const ${componentName}Props>(props);
    
    // TODO: Apply props to the view
    // e.g. self.someProperty = newProps.someProperty;
    
    [super updateProps:props oldProps:oldProps];
}

@end
`;
    files.push({
      filename: `${componentName}View.mm`,
      language: "objc",
      platform: "ios",
      content: objcImpl,
    });

    const cppHeader = `#pragma once

#include <react/renderer/core/Props.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

class ${componentName}Props : public ViewProps {
public:
    ${componentName}Props() = default;
    ${componentName}Props(const PropsParserContext& context, const ${componentName}Props &sourceProps, const RawProps &rawProps);

${props.map((p) => `    ${mapTypeToCpp(p.type)} ${p.name}{};`).join("\n")}
};

} // namespace facebook::react
`;
    files.push({
      filename: `${componentName}Props.h`,
      language: "cpp",
      platform: "ios",
      content: cppHeader,
    });
  }

  return files;
}

export const TEMPLATES = [
  {
    id: "camera-module",
    name: "Camera Module",
    description: "Native module for accessing device camera and capturing photos/videos",
    specType: "NativeModule" as const,
    moduleName: "Camera",
    spec: `import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestCameraPermission(): Promise<string>;
  takePicture(options: string): Promise<string>;
  startRecording(outputPath: string): Promise<void>;
  stopRecording(): Promise<string>;
  getCameraList(): Promise<string>;
  isFlashAvailable(): Promise<boolean>;
}`,
  },
  {
    id: "biometric-module",
    name: "Biometric Auth Module",
    description: "Native module for fingerprint and face ID authentication",
    specType: "NativeModule" as const,
    moduleName: "BiometricAuth",
    spec: `import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isBiometricAvailable(): Promise<boolean>;
  getBiometricType(): Promise<string>;
  authenticate(reason: string): Promise<boolean>;
  cancelAuthentication(): void;
}`,
  },
  {
    id: "storage-module",
    name: "Secure Storage Module",
    description: "Native module for encrypted key-value storage using Keychain/Keystore",
    specType: "NativeModule" as const,
    moduleName: "SecureStorage",
    spec: `import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string>;
  removeItem(key: string): Promise<void>;
  clearAll(): Promise<void>;
  getAllKeys(): Promise<string>;
}`,
  },
  {
    id: "map-view",
    name: "Map View Component",
    description: "Native component wrapping Google Maps / Apple Maps",
    specType: "NativeComponent" as const,
    moduleName: "MapView",
    spec: `import type { ViewProps } from 'react-native';

export interface NativeProps extends ViewProps {
  latitude: number;
  longitude: number;
  zoom: number;
  showsUserLocation: boolean;
  mapType: string;
  onRegionChange: string;
}`,
  },
  {
    id: "video-player",
    name: "Video Player Component",
    description: "Native video player component with playback controls",
    specType: "NativeComponent" as const,
    moduleName: "VideoPlayer",
    spec: `import type { ViewProps } from 'react-native';

export interface NativeProps extends ViewProps {
  source: string;
  paused: boolean;
  muted: boolean;
  volume: number;
  resizeMode: string;
  repeat: boolean;
  onLoad: string;
  onError: string;
  onProgress: string;
}`,
  },
  {
    id: "location-module",
    name: "Location Module",
    description: "Native module for GPS location and geocoding",
    specType: "NativeModule" as const,
    moduleName: "Location",
    spec: `import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestPermission(): Promise<string>;
  getCurrentPosition(): Promise<string>;
  watchPosition(interval: number): Promise<number>;
  clearWatch(watchId: number): void;
  reverseGeocode(latitude: number, longitude: number): Promise<string>;
}`,
  },
];
