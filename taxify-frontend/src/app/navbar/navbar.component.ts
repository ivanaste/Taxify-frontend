import { LoggedInUser } from 'src/app/auth/model/logged-in-user';
import * as AuthActions from '../auth/store/auth.actions';
import * as PassengerActions from './../passengers/store/passengers.actions';
import { Store } from '@ngrx/store';
import {
  AfterViewInit,
  Component,
  DoCheck,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { map, Subscription } from 'rxjs';
import * as fromApp from '../store/app.reducer';
import { StompService } from '../stomp.service';
import { ToastrService } from 'ngx-toastr';
import { Notification } from '../passengers/model/notification';
import * as MapActions from '../maps/store/maps.actions';
import * as DriversActions from '../drivers/store/drivers.actions';
import { DriverState } from '../drivers/model/driverState';
import { MapsService } from '../maps/maps.service';
import { MatDialog } from '@angular/material/dialog';
import { RideAssessmentDialogComponent } from '../maps/rideAssessmentDialog/ride-assessment-dialog/ride-assessment-dialog.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  private userSub: Subscription;
  isAuthenticated = false;

  constructor(
    private store: Store<fromApp.AppState>,
    private stompService: StompService,
    private toastr: ToastrService,
    private mapService: MapsService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.userSub = this.store
      .select('auth')
      .pipe(map((authState) => authState.user))
      .subscribe((user) => {
        this.isAuthenticated = !user ? false : true;
        if (user?.role === 'PASSENGER') {
          this.subscribeOnWebSocketAsPassenger(user.email);
          this.loadPassengerNotifications();
        } else if (user?.role === 'DRIVER') {
          this.subscribeOnWebSocketAsDriver(user.email);
        }
        if (this.isAuthenticated) {
          this.mapService.loadActiveRide();
        }
      });
  }

  subscribeOnWebSocketAsPassenger(email: string) {
    const stompClient = this.stompService.connect();
    stompClient.connect({}, () => {
      stompClient.subscribe(
        '/topic/passenger-notification/' + email,
        (response): any => {
          let message = this.getNotificationMessageFromWebSocket(response.body);
          this.showNotificationToast(message);
          this.loadPassengerNotifications();
        }
      );
    });
  }

  subscribeOnWebSocketAsDriver(email: string) {
    const stompClient = this.stompService.connect();
    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/driver/' + email, (response): any => {
        let message = this.getNotificationMessageFromWebSocket(response.body);
        this.showNotificationToast(message);
      });
    });
  }

  getNotificationMessageFromWebSocket(socketMessage): string {
    switch (socketMessage) {
      case 'ADDED_TO_THE_RIDE':
        return 'You have been added to the ride.';
      case 'RIDE_ACCEPTED':
        this.mapService.loadActiveRide();
        return 'Your ride has been accepted.';
      case 'VEHICLE_ARRIVED':
        return 'Vehicle has arrived on your destination.';
      case 'RIDE_STARTED':
        this.startRideForPassenger();
        return 'Your ride has started.';
      case 'RIDE_FINISHED_PASSENGER':
        this.openDialogForPassengerReview();
        return 'Your ride has finished.';
      case 'RIDE_FINISHED_DRIVER':
        this.resetStateAfterRideFinished();
        return 'You successfully finished a ride.';
      case 'RIDE_ASSIGNED':
        this.store.dispatch(
          new DriversActions.SetDriverState({
            state: DriverState.RIDING_TO_CLIENT,
          })
        );
        this.store.dispatch(new MapActions.LoadActiveRoute());
        this.store.dispatch(new MapActions.SimulateDriverRideToClient());
        return 'Ride has been assigned to you.';
      case 'RIDE_REJECTED':
        this.resetStateAfterRideFinished();
        return 'Your ride has been rejected.';
      case 'ON_DESTINATION_PASSENGER':
        return 'You have arrived on your destination.';
      case 'ON_DESTINATION_DRIVER':
        this.store.dispatch(
          new DriversActions.SetDriverState({
            state: DriverState.ARRIVED_TO_DESTINATION,
          })
        );
        return 'You have arrived on destination.';
      default:
        return 'Your ride has been scheduled.';
    }
  }

  resetStateAfterRideFinished() {
    this.store.dispatch(new MapActions.ResetStateAfterRideFinish());
  }

  startRideForPassenger() {
    this.store.dispatch(new MapActions.RideStartedPassenger());
  }

  showNotificationToast(message: string) {
    this.toastr.info(message, 'Notification', {
      timeOut: 5000,
      closeButton: true,
      tapToDismiss: true,
      newestOnTop: true,
      positionClass: 'toast-top-center',
    });
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
  }

  onLogout() {
    this.store.dispatch(new AuthActions.LogoutStart());
  }

  loadPassengerNotifications() {
    this.store.dispatch(
      new PassengerActions.GetPassengerNotifications({
        markNotificationsAsRead: false,
      })
    );
  }

  openDialogForPassengerReview() {
    const dialogRef = this.dialog.open(RideAssessmentDialogComponent, {
      disableClose: true,
      data: {
        title: 'Drive rejection',
        subtitleQuestion: "What's your reason for rejecting a drive?",
        buttonContent: 'Save reason',
      },
    });

    dialogRef.afterClosed().subscribe((rates) => {
      if (
        rates.comment !== '' ||
        rates.driverRating !== 0 ||
        rates.vehicleRating !== 0
      ) {
        console.log(rates);
        this.store.dispatch(
          new PassengerActions.LeaveReviewStart({
            comment: rates.comment,
            driverRating: rates.driverRating,
            vehicleRating: rates.vehicleRating,
          })
        );
      }
    });
  }
}
