// Run against the local Vite server. The fixture deliberately imports no optics.
async (page) => {
  await page.goto(new URL('/tests/browser/fixtures/material-scope.html',page.url()).href);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const contour = group => group.locator('.jb-selection-svg');
  const color = group => contour(group).evaluate(el=>el.style.getPropertyValue('--jb-contour-color').trim());
  const matches = async (group, expected) => {
    await page.waitForFunction(({label,expected})=>{
      const group=document.querySelector(`[aria-label="${label}"]`);
      return group?.querySelector('.jb-selection-svg')?.style.getPropertyValue('--jb-contour-color').trim()===expected;
    },{label:await group.getAttribute('aria-label'),expected},{timeout:3000});
  };
  const choices=page.getByRole('radiogroup',{name:'Scoped choices'}), tabs=page.getByRole('tablist',{name:'Scoped tabs'});
  await matches(choices,'#ffb251'); await matches(tabs,'#ffb251');
  await page.getByRole('button',{name:'Change pigment'}).click();
  await matches(choices,'#bc69d7');await matches(tabs,'#bc69d7');
  await page.getByRole('radio',{name:'Save',exact:true}).click();
  await matches(choices,'#62cf9c');
  await page.getByRole('tab',{name:'Danger',exact:true}).click();
  await matches(tabs,'#f18787');
  return {pass:true,selection:await color(choices),tab:await color(tabs)};
}
