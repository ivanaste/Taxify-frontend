import { EmailActivationComponent } from '../auth/components/email-activation/email-activation.component';
import { AuthComponent } from '../auth/components/auth/auth.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
