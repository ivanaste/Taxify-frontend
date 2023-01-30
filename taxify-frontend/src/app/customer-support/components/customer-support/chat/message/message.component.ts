import { Component, Input } from '@angular/core';
import { Message } from '../../../../model/message.model';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent {
  @Input() message: Message;
  @Input() loggedInUserEmail: string;
}