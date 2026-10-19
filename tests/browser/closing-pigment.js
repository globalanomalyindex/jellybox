async (page) => {
  const study=new URL(page.url());study.hash='';
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(study.href);
  await page.waitForFunction(()=>document.documentElement.classList.contains('optics-ready'));
  const tools=page.getByRole('region',{name:'Interactive JellyBox material experiment',exact:true});
  await tools.getByRole('button',{name:'Color',exact:true}).click();
  await page.waitForTimeout(950);
  await page.getByRole('button',{name:'Candy',exact:true}).click();
  await tools.getByRole('button',{name:'Material',exact:true}).click();
  await page.waitForTimeout(1100);
  await tools.getByRole('button',{name:'Close Material panel',exact:true}).click();
  await page.waitForTimeout(330);
  const displayed=await tools.locator('.panel-surface').evaluate(el=>getComputedStyle(el).getPropertyValue('--jb-color').trim());
  const [red,,blue]=[1,3,5].map(at=>parseInt(displayed.slice(at,at+2),16));
  await page.screenshot({path:'output/playwright/closing-pigment.png'});
  if(red-blue<20)throw Error(`Candy's amber Material carrier lost its pigment while closing: ${displayed}`);
  await page.waitForTimeout(500);
  if(await tools.getByRole('button',{name:'Close Material panel',exact:true}).count())throw Error('Closing did not finish');
  return {pass:true,closingMaterial:displayed};
}
