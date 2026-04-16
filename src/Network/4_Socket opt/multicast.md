# 소켓 옵션
지금까지의 소켓 프로그램에서는 소켓의 디폴트 설정 값을 그대로 사용했는데, TPC/IP 프로토콜의 세부적인 기능을 활용하거나 소켓의 동작을 변경하려면 소켓 옵션을 사용해야 함.

**소켓 옵션 변경함수**
```C
// 지금 이 소켓 설정이 어떻게 되어 있는지 물어보는 함수
int getsockopt(int s, int level, int opt, const char *optval, int *optlen);

// 옵션 값을 바꾸는 함수
int setsockopt(int s, int level, int opt, const char *optval, int optlen);
```
- s: 소켓 번호 (설정을 바꾸거나 읽어올 대상 소켓)
- level: 옵션의 계층 
  - SOL_SOCKET: 소켓 일반에 대한 설정 (재사용 옵션)
  - IPPROTO_IP: IP 계층에 대한 설정 (멀티캐스트 그룹 가입) 
  - IPPROTO_TCP: TCP 계층에 대한 설정 (지연 전송 방지)
- opt: 옵션의 이름
  - SO_REUSEADDR: 주소 재사용 여부
  - IP_ADD_MEMBERSHIP: 멀티캐스트 그룹 가입
- *optval:설정값의 주소 (설정하려는 값 자체가 들어있는 메모리 주소)
- (*)optlen: 설정값의 크기 (getsockapt에서는 주소, setsockapt에서는 정수값)

성공 시 0 (이 소켓은 멀티캐스트 그룹의 멤버로 지정됐다는 뜻), 실패 시 -1 반환
  
<br>
동일한 소켓 주소를 같은(다른) 프로세스의 여러 소켓에서 사용함. 기본적으로 한 호스트에서 같은 포트번호 중복 사용 불가한데 재사용 옵션이 필요한 경우는 다음과 같음.

- TIME-WAIT 상태에서 주소를 재사용하는 경우
    - ACTIVE CLOSE 상태의 호스트는 TIME-WAIT 상태를 가지며 포트번호를 중복하여 사용 불가
- 서버에서 자식 프로세스가 서비스 처리를 담당하는 경우
	- 부모 프로세스가 종료되어 다시 시작하게 되면 포트번호 사용 중 오류
	- 소켓 주소 재사용 옵션은 bind() 호출 이전에 설정해야함
- 멀티홈 서버
	- 호스트가 두  이상의 IP 주소를 가지며 같은 포트번호를 사용하는 경우
- 완전 중복 바인딩
	- 동일한 IP주소와 포트번호를 중복하여 bind하는 것. UDP 에서만 사용가능
<br><br>


### 멀티 캐스트
하나의 데이터그램을 다수의 호스트에 전송하는 것으로, 데이터그램이 네트워크 내에서 복제되어 다수의 호스트로 전송됨. 멀티 캐스트를 수신하려는 호스트는 해당 **멀티캐스트 그룹**에 가입해야 함. <br>

특징:
- UDP 기반: TCP처럼 1대1로 확인하는 절차가 없음. 그냥 특정 주소로 데이터를 던지면 그룹 가입자들이 알아서 받아감
- 네트워크 복제: 서버가 100명에게 데이터를 보내기 위해 100번 전송하는 건 아님. 서버는 딱 한 번 전송하고 중간에 있는 라우터들이 복제해서 뿌려줌. (네트워크 부하가 줄어듦)
- Class D 주소: 일반적인 IP주소가 아니라 $224.0.0.0$ 부터 $239.255.255.255$ 사이의 특수 주소를 사용함.

<br>

흐름:
- 그룹 가입: 수신측 호스트는 "$224.1.1.1$ 그룹에 들어간다고 선언해야 함. 이때 내부적으로 IGMP라는 프로토콜이 작동하여 라우터에게 가입 소식을 알림
- 데이터 송신: 송신측은 그냥 목적지 주소를 해당 그룹 주소(Class D)로 적어서 쏘기만 하면 됨.

<br>

```C
#include "netprog2.h"
#define MAXLINE 1023

int main(int argc, char *argv[]) {
    // send_s, recv_s: 송수신 소켓
    int send_s, recv_s, n, len;
    pid_t pid;
    unsigned int yes = 1;

    struct sockaddr_in mcast_group; // 멀티캐스트 그룹주소
    struct ip_mreq mreq;
    char name[10];  // 채팅 참가자 이름

    if (argc != 4) {
        printf ("사용법: %s multicast_address port My_name\n");
        exit(1);
    }

    sprintf(name, "[%s]", argv[3]);

    // 멀티캐스트 수신용 소켓 개설
    memset(&mcast_group, 0, sizeof(mcast_group));   // 초기화
    mcast_group.sin_family = AF_INET;   // IPv4
    mcast_group.sin_port = htons(atoi(argv[2]));    // 채팅방 포트 번호
    inet_pton(AF_INET, argv[1], &mcast_group.sin_addr);  // 멀티캐스트 그룹 주소

    // 수신 전용 UDP 소켓 생성
    if ((recv_s = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {    
        printf("error: Can't create receive socket\n");
        exit(1);
    }

    // 멀티캐스트 그룹에 가입
    // 앞으로 이 그룹 주소로 오는 패킷은 버리지 말고 달라고 하는 단계
    mreq.imr_multiaddr = mcast_group.sin_addr;      // 가입할 그룹의 주소
    mreq.imr_interface.s_addr = htonl(INADDR_ANY);  // 내 컴퓨터의 어떤 네트워크 카드(IP)로 받을 것인가

    // 해당 소켓을 멀티캐스트 그룹 멤버로 등록 
    // IPPROTO_IP 레벨에서 IP_ADD_MEMBERSHIP 옵션을 적용
    if (setsockopt(recv_s, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq))< 0) {
        printf("error: add membership\n");
        exit(1);
    }

    // 소켓 재사용 옵션 지정 (SO_REUSEADDR)
    // 이 옵션이 없으면 한 컴퓨터에서 두 명 이상이 같은 포트로 채팅방을 못 킴.
    if (setsockopt(recv_s, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes)) < 0) {
        printf("error: reuse setsockopt\n");
        exit(1);
    }

    // 소켓 바인드 (이 포트로 들어오는 멀티캐스트 데이터를 기다리겠다는 의미)
    // 예를 들어 들어온 멀티캐스트 데이터 중에서 포트번호가 9000번인 것들만 recv로 전달
    if (bind(recv_s, (struct sockaddr*)&mcast_group, sizeof(mcast_group)) < 0) {
        printf("error: bind receive socekt\n");
        exit(1);
    }

    // 멀티캐스트 메시지 송신용 소켓 개설 (일반 UDP 소켓)
    if ((send_s = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {
        printf("error: Can't create send socket\n");
        exit(1);
    }

    // fork 실행: child는 수신 담당 parent는 송신 담당
    if ((pid = fork()) < 0) {
        printf("error: fork\n");
        exit(1);
    }
    else if (pid == 0) {    // child process: 채팅 수신 담당
        struct sockaddr_in from;
        char message[MAXLINE + 1];

        for(;;) {
            printf("receiving message...\n");
            len = sizeof(from);

            // 누군가 그룹에 메시지를 쏘면 여기서 낚아 챔
            if ((n = recvfrom(recv_s, message, MAXLINE, 0, (struct sockaddr*)&from, &len)) < 0) {
                printf("error: recvfrom\n");
                exit(1);
            }
            message[n] = 0;
            printf("Received Message: %s\n", message);
        }
    }
    else {  // parent process: 키보드 입력 및 메시지 송신 담당
        char message[MAXLINE + 1], line[MAXLINE + 1];
        printf("Send Message: ");
        
        while (fgets(message, MAXLINE, stdin) != NULL) {
            sprintf(line, "%s %s", name, message);
            len = strlen(line);

            // 멀티캐스트 그룹 주소로 메시지를 발송 (전체 발송)
            if (sendto(send_s, line, strlen(line), 0, (struct sockaddr*)&mcast_group, sizeof(mcast_group)) < len) {
                printf("error: sendto\n");
                exit(1);
            }
        }
    }
    return 0;
}

```