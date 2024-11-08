import postcss from "postcss";
import type { PluginCreator } from "tailwindcss/types/config.js";

export const animationDurationSymbol = Symbol("Animation duration");
export const animationTimingFunctionSymbol = Symbol("Animation timing function");
export const animationFillModeSymbol = Symbol("Animation fill mode");
export const animationInitialSymbol = Symbol("Animation initial");
export const animationModifierSymbol = Symbol("Animation modifier");

type InternalPluginAPIExtra = {
  'modifier': string|null,
  'container'?: postcss.Rule
};
// eslint-disable-next-line no-underscore-dangle
const _walkRules = postcss.Root.prototype.walkRules;
const animationSelectorPattern = /^(.+)\[animation="(.+?)"](.*)$/;

const daldalsoTailwindPlugin:PluginCreator = api => {
  // Shadow
  api.matchUtilities(
    {
      'sha': (value, { modifier }) => ({
        '--tw-box-sha-color': modifier ? rgba(value, parseFloat(modifier)) : value,
        boxShadow: "var(--tw-box-sha-x, 0) var(--tw-box-sha-y, 0) var(--tw-box-sha-blur, 1px) var(--tw-box-sha-spread, 0) var(--tw-box-sha-color)"
      }),
      'text-sha': (value, { modifier }) => ({
        '--tw-text-sha-color': modifier ? rgba(value, parseFloat(modifier)) : value,
        textShadow: "var(--tw-text-sha-x, 0) var(--tw-text-sha-y, 0) var(--tw-text-sha-blur, 1px) var(--tw-text-sha-color)"
      }),
      'drop-sha': (value, { modifier }) => ({
        '--tw-drop-sha-color': modifier ? rgba(value, parseFloat(modifier)) : value,
        filter: "drop-shadow(var(--tw-drop-sha-x, 0) var(--tw-drop-sha-y, 0) var(--tw-drop-sha-blur, 1px) var(--tw-drop-sha-color))"
      })
    },
    { type: "color", values: api.theme("colors"), modifiers: api.theme("opacity") }
  );
  api.matchUtilities(
    {
      'sha': (value, { modifier }) => {
        if(modifier === null){
          return { '--tw-box-sha-x': value, '--tw-box-sha-y': value };
        }
        return { '--tw-box-sha-x': value, '--tw-box-sha-y': modifier };
      },
      'drop-sha': (value, { modifier }) => {
        if(modifier === null){
          return { '--tw-drop-sha-x': value, '--tw-drop-sha-y': value };
        }
        return { '--tw-drop-sha-x': value, '--tw-drop-sha-y': modifier };
      },
      'text-sha': (value, { modifier }) => {
        if(modifier === null){
          return { '--tw-text-sha-x': value, '--tw-text-sha-y': value };
        }
        return { '--tw-text-sha-x': value, '--tw-text-sha-y': modifier };
      }
    },
    { type: "position", values: api.theme("spacing"), modifiers: api.theme("spacing"), supportsNegativeValues: true }
  );
  api.matchUtilities(
    {
      'sha-blur': value => ({
        '--tw-box-sha-blur': value
      }),
      'drop-sha-blur': value => ({
        '--tw-drop-sha-blur': value
      }),
      'text-sha-blur': value => ({
        '--tw-text-sha-blur': value
      })
    },
    { type: "position", values: api.theme("blur") }
  );
  api.matchUtilities(
    {
      'sha-spread': value => ({
        '--tw-box-sha-spread': value
      })
    },
    { type: "position", values: api.theme("spacing") }
  );

  // Animation (static)
  api.matchUtilities(
    {
      'animate-delay': value => ({
        animationDelay: value
      }),
      'animate-duration': value => ({
        animationDuration: value
      })
    },
    { type: "any", values: api.theme("transitionDuration") }
  );
  for(const [ k, v ] of Object.entries(api.theme("keyframes") || {})){
    api.matchUtilities({
      [`animate-${k}`]: (_, { modifier }) => {
        const defaultDuration = api.theme("transitionDuration")!['DEFAULT'];
        const defaultFillMode = "both";
        const defaultTimingFunction = "ease";

        return {
          [`@keyframes ${k}`]: v,
          ...v[animationInitialSymbol],
          ...modifier === null ? {} : { [v[animationModifierSymbol]]: modifier },
          animationName: k,
          animationDuration: v[animationDurationSymbol] || defaultDuration,
          animationFillMode: v[animationFillModeSymbol] || defaultFillMode,
          animationTimingFunction: v[animationTimingFunctionSymbol] || defaultTimingFunction
        };
      }
    }, { values: { DEFAULT: "" }, modifiers: animationModifierSymbol in v ? "any" : undefined });
  }

  // Animation (dynamic)
  const animations:Record<string, postcss.AtRule> = {};
  const keyframes:Record<string, postcss.Rule> = {};
  api.matchVariant("kf", (chunk, { container }:InternalPluginAPIExtra) => {
    const [ animationName, keyframeName ] = chunk.split(':');
    if(!keyframeName){
      return `&[animation="${chunk}"]`;
    }
    const isNewAnimation = !(animationName in animations);
    const isNewKeyframe = !(chunk in keyframes);
    const animation = animations[animationName] ||= postcss.atRule({ name: "keyframes", params: animationName });
    const keyframe = keyframes[chunk] ||= postcss.rule({ selector: keyframeName });

    container?.walkDecls(decl => {
      keyframe.append(decl);
    });
    if(isNewKeyframe) animation.append(keyframe);
    if(!isNewAnimation) return [];
    return `&[animation="${chunk}"]`;
  });
  postcss.Root.prototype.walkRules = function(this:postcss.Root, callback){
    const R = _walkRules.apply(this, arguments as any);

    if(typeof callback === "function" && callback.toString().includes("inKeyframes") && this.first?.type === "rule"){
      const [ , prefix, value, suffix ] = this.first.selector.match(animationSelectorPattern) || [];
      const keyframe = value && keyframes[value];

      if(keyframe){
        const subroot = postcss.root();

        subroot.append(`${prefix + suffix}{ animation-name: ${value.split(':')[0]}; }`);
        subroot.append(keyframe.parent);
        Object.assign(this.first, {
          type: 'root',
          nodes: [ subroot ]
        });
      }
    }
    return R;
  } as typeof postcss.Root.prototype.walkRules;
};
export default daldalsoTailwindPlugin;

function rgba(value:string, opacity:number):string{
  return `${value}${Math.round(255 * opacity).toString(16).padStart(2, "0").toUpperCase()}`;
}