async (page) => {
  const study = new URL(page.url()); study.hash = '';
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(study.href);
  await page.waitForFunction(() => document.documentElement.classList.contains('optics-ready'));
  const tools = page.getByRole('region',{name:'Interactive JellyBox material experiment',exact:true});
  await tools.getByRole('button',{name:'Color',exact:true}).click();
  await page.getByRole('button',{name:'Candy',exact:true}).click();
  await tools.getByRole('button',{name:'Material',exact:true}).click();
  await page.getByRole('button',{name:'Shape & optics',exact:true}).click();
  await page.mouse.move(1380,20); await page.waitForTimeout(1400);
  const sampleAt = async (bounds, x, y) => page.evaluate(async ({png,bounds,x,y}) => {
    const bitmap=await createImageBitmap(await(await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas=document.createElement('canvas'); canvas.width=bitmap.width;canvas.height=bitmap.height;
    const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
    const scale=bitmap.width/innerWidth;
    const data=context.getImageData(Math.round((bounds.x+bounds.width*x)*scale)-3,Math.round((bounds.y+bounds.height*y)*scale)-3,7,7).data;
    const rgb=[0,0,0];for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)rgb[c]+=data[i+c]/49;
    bitmap.close();return rgb.map(Math.round);
  },{png:(await page.screenshot()).toString('base64'),bounds,x,y});
  const sample=await sampleAt(await page.getByRole('button',{name:'Thickness 100%',exact:true}).boundingBox(),.5,.82);
  if(sample[0]-sample[2]<12)throw new Error(`The warm Material palette did not reach its slider value: RGB ${sample.join(', ')}`);
  await page.getByRole('button',{name:'Shape & optics',exact:true}).hover();
  await page.waitForTimeout(700);
  const folder=await sampleAt(await tools.locator('.jelly-details').boundingBox(),.64,.985);
  if(folder[0]-folder[2]<12)throw new Error(`The folder hover did not inherit its warm pigment: RGB ${folder.join(', ')}`);
  return {pass:true,materialSlider:sample,folderHover:folder};
}
