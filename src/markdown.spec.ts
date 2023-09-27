import {replaceMarkdownImages} from './markdown.js'

const testMd = `
Finding a worthy campsite is a lot more involved than just showing up at the nearest KOA off the freeway.

 ByAmos Kwon

 May 29, 2015

![CHRIS BURKARD MSR CASCADES TRIP](https://hips.hearstapps.com/amv-prod-gp.s3.amazonaws.com/gearpatrol/wp-content/uploads/2015/05/Best-Campgrounds-West-Gear-Patrol-Lead-Full.jpg?crop=0.6701030927835051xw:1xh;center,top&resize=640:*)

Setting up camp in the Cascades | Chris Burkard

Horace Greeley [once wrote](https://www.gearpatrol.com/briefings/a71366/must-read-books-for-men/), “Go West, young man” — and he could not have been more right. The West is a land of palatial beauty, and it’s virtually unparalleled in its grandeur. What better way to experience its stunning vistas than while [roughing it](https://gearpatrol.com/2015/05/27/how-to-pack-a-cooler-for-weekend-camping/) in the great outdoors?

`
describe('image replace', () => {
  it('should work', async () => {
    const output = await replaceMarkdownImages(
      'http://google.com',
      '_test',
      '1',
      testMd
    )
    expect(output).toMatchSnapshot()
  })
})
