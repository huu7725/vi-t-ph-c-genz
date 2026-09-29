import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const password='Demo-password-2026!';
async function studio(page: Page) {
  await page.getByRole('navigation').getByRole('button',{name:'Phòng phối đồ'}).click();
  await expect(page.getByRole('complementary',{name:'Quyền trải nghiệm'})).toContainText('AI còn');
}
async function fillRegistration(page: Page, email: string, name='An Việt') {
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Tên của bạn').fill(name);
  await dialog.getByLabel('Email',{exact:true}).fill(email);
  await dialog.getByLabel('Mật khẩu',{exact:true}).fill(password);
  await dialog.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);
}

test('guest wardrobe limit, registration with migration, logout and login preserve account data', async ({page},info) => {
  const email=`wardrobe-${randomUUID()}@example.test`;
  await page.goto('/'); await studio(page);
  for (const name of ['Xanh ngọc bích','Đỏ gạch nung','Tím hoa cà']) {
    await page.getByRole('button',{name:`Màu áo: ${name}`,exact:true}).click();
    await page.getByRole('button',{name:'Lưu bản phối này',exact:true}).click();
    await expect(page.getByRole('button',{name:'Lưu bản phối này',exact:true})).toBeEnabled();
  }
  await expect(page.getByRole('complementary',{name:'Quyền trải nghiệm'})).toContainText('3/3 bản phối');
  await page.getByRole('button',{name:'Màu áo: Hồng phấn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu bản phối này',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Khách trải nghiệm lưu tối đa 3 bản phối');
  await fillRegistration(page,email);
  await page.getByRole('dialog').getByLabel('Nhập lại mật khẩu').fill('different-password');
  await page.getByRole('dialog').getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('chưa khớp');
  await page.getByRole('dialog').getByLabel('Nhập lại mật khẩu').fill(password);
  await page.screenshot({path:`test-results/${info.project.name}-register.png`,animations:'disabled',fullPage:false});
  await page.getByRole('dialog').getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Tài khoản của An Việt'})).toBeVisible();
  await expect(page.getByRole('complementary',{name:'Quyền trải nghiệm'})).toContainText('3/100 bản phối');
  await page.getByRole('button',{name:'Lưu bản phối này',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Quyền trải nghiệm'})).toContainText('4/100 bản phối');
  await page.reload();
  await page.getByRole('button',{name:'Tài khoản của An Việt'}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await page.getByRole('navigation').getByRole('button',{name:/Lookbook/}).click();
  await expect(page.locator('.saved-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Email',{exact:true}).fill(email);
  await page.getByRole('dialog').getByLabel('Mật khẩu',{exact:true}).fill('incorrect-password');
  await page.getByRole('button',{name:'Đăng nhập vào tài khoản',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Email hoặc mật khẩu chưa đúng');
  await page.getByRole('dialog').getByLabel('Mật khẩu',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Đăng nhập vào tài khoản',exact:true}).click();
  await expect(page.locator('.saved-card')).toHaveCount(4);
  expect(await page.evaluate(()=>document.cookie)).not.toContain('vpr_session');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(password);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('three successful AI uses exhaust guest quota across reload; free samples remain available', async ({page},info) => {
  await page.goto('/'); await studio(page);
  await page.getByLabel('Bạn sẽ mặc vào dịp nào?').selectOption('ngoai_khoa');
  await page.getByRole('button',{name:'Gợi ý cùng Gemini',exact:true}).click();
  const quota=page.getByRole('complementary',{name:'Quyền trải nghiệm'});
  await expect(quota).toContainText('AI còn 2/3');
  await page.getByRole('button',{name:'Tạo lại',exact:true}).click(); await expect(quota).toContainText('AI còn 1/3');
  await page.getByRole('button',{name:'Tạo lại',exact:true}).click(); await expect(quota).toContainText('AI còn 0/3');
  await page.getByRole('button',{name:'Tạo lại',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Bạn đã dùng hết 3 lượt AI hôm nay');
  await page.screenshot({path:`test-results/${info.project.name}-ai-limit.png`,animations:'disabled'});
  await page.getByRole('button',{name:/Tiếp tục với vai trò khách/}).click();
  await page.reload(); await studio(page); await expect(quota).toContainText('AI còn 0/3');
  await page.getByRole('button',{name:/Xem gợi ý mẫu/}).click();
  await expect(page.locator('.look-card').first()).toBeVisible();
  await expect(page.getByText('Gợi ý mẫu — chưa sử dụng Gemini. Không trừ lượt AI.',{exact:true})).toBeVisible();
  await expect(quota).toContainText('AI còn 0/3');
});

test('guest experience is optional; another account cannot see the previous member wardrobe',async ({page},info)=>{
  await page.goto('/'); await studio(page);
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await page.getByRole('button',{name:/Tiếp tục với vai trò khách/}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await fillRegistration(page,`a-${randomUUID()}@example.test`,'Bạn A');
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tài khoản của Bạn A'})).toBeVisible();
  await page.getByRole('button',{name:'Lưu bản phối này',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Quyền trải nghiệm'})).toContainText('1/100');
  await page.getByRole('button',{name:'Tài khoản của Bạn A'}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await fillRegistration(page,`b-${randomUUID()}@example.test`,'Bạn B');
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tài khoản của Bạn B'})).toBeVisible();
  await page.getByRole('navigation').getByRole('button',{name:/Lookbook/}).click();
  await expect(page.locator('.saved-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Tài khoản của Bạn B'}).click();
  await page.screenshot({path:`test-results/${info.project.name}-account.png`,animations:'disabled'});
});
