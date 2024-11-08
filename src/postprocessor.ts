import md5 from "md5";

const anonymousAnimationPattern = /\bkf-\[((?:.(?!:))+?)]:(\S+)/g;
const daldalsoTailwindPluginPostprocessor = (input:string) => {
  let chunk = "";
  const R = input.replace(anonymousAnimationPattern, (_, g1:string, g2:string) => {
    chunk += `${g1},${g2} `;
    return `kf-[((anonymous)):${g1}]:${g2}`;
  });
  // Could be duplicated!
  const hash = `dtp-${md5(chunk.trim()).slice(0, 16)}`;

  return R.replaceAll("((anonymous))", hash);
};
export default daldalsoTailwindPluginPostprocessor;