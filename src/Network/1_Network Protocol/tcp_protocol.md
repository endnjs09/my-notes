# 소켓 프로그래밍
**소켓**: TCP나 UDP와 같은 트랜스포트 계층을 이용하는 API <br>
**소켓 디스크립터**: 소켓을 개설하여 얻는 파일 디스크립터. 데이터 송수신시 사용
<br>

소켓에 사용할 정보들
- 프로토콜(TCP, UDP)
- 자신의 IP 주소
- 자신의 Port 번호
- 상대방의 IP 주소
- 상대방의 Port 번호
<br>

sockaddr_in 구조체 사용를 사용함. 주소체계(AF_INET), port번호(16비트), ip주소(32비트)를 담고 있음.
<br><br>

### UDP 소켓 프로그래밍
상세 특징:
- 비연결성: TCP처럼 connect() 과정(3-way handshake)을 거쳐 연결통로를 만들지 않음. 그냥 데이터를 보낼 주소만 알면 바로 던짐.
- 신뢰성 낮음: 데이터가 가다가 사라지거나, 순서가 뒤바뀌어 도착해도 UDP는 책임지지 않음
- 경계가 있는 데이터 그램: 데이터를 덩어리 단위로 보냄. 받는 쪽에서도 보낸 덩어리를 그대로 받아야함.
- 속도 중심: 오버헤드가 적어 실시간 스트리밍, 온라인 게임, DNS 조회 등에 주로 쓰임.
<br><br>

통신흐름:
1. 서버: UDP 소켓 생성(socket()) $\rightarrow$ 특정 포트 번호에 소켓을 결합하여 외부에서 들어올 문을 열어둠(bind()) $\rightarrow$ 누군가 데이터를 보낼 때까지 무한히 기다림 (recvfrom()) $\rightarrow$ 받은 정보를 바탕으로 응답을 보냄 (sendto())
```C
#include "netprog.h"
#define MAXLINE 511

// udp_echoserv.c
int main(int argc, char * argv[]) {
    // 서버, 클라이언트 주소
    struct sockaddr_in servaddr, cliaddr;   

    // 소켓 번호, 받은 바이트 수, 주소 길이를 저장할 변수
    int s, nbyte, addrlen = sizeof(struct sockaddr);

    // 데이터 담을 버퍼(바구니)
    char buf[MAXLINE + 1];

    if (argc!= 2) {
        printf("usage: %s port\n", argv[0]);
        exit(0);
    }
    
    // 소켓 생성 (PF_INET: IPv4 인터넷 체계 | SOCK_DGRAM: UDP 방식)
    if ((s = socket(PF_INET, SOCK_DGRAM, 0)) < 0) {
        errquit("socket fail");
    }
    
    // 주소 초기화 (bzero: 메모리를 '\0'으로 비움
    bzero((char*)&servaddr, addrlen);
    bzero((char*)&cliaddr, addrlen);

    // 서버 주소 세팅
    servaddr.sin_family = AF_INET;  // IPv4
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);   // 리틀 엔디안 -> 빅 엔디안 변환
    servaddr.sin_port = htons(atoi(argv[1]));    // 실행 시 입력한 숫자를 포트 번호로 설정
    
	// bind: 소켓에 주소를 입힘 (Port번호로 오는 데이터를 소켓(s)로 넣기)
	if (bind(s, (struct sockaddr*)&servaddr, addrlen) < 0) {
		errquit("bind fail");
	}
	
	// 서버 열기 (상시)
	while(1) {
		puts("Server: waiting request.");
        // recvfrom: 요청이 올때까지 기다림
        // cliaddr: 요청이 오면 보낸 사람의 주소를 여기에 적음
		nbyte = recvfrom(s, buf, MAXLINE, 0, (struct sockaddr*)&cliaddr, &addrlen);

		if (nbyte < 0) {
			errquit("recvfrom fail");
		}

		buf[nbyte] = 0; // 받은 데이터 끝에 '여기까지가 끝'이라는 표시(\0)를 함
		printf("%d byte recv: %s\n", nbyte, buf);

        // 에코(Echo): 받은 내용을 그대로 다시 보냄
        // cliaddr에 적힌 '보낸 사람 주소'로 buf의 내용을 던짐
		if (sendto(s, buf, nbyte, 0, (struct sockaddr*)&cliaddr, addrlen) < 0) {
			errquit("sendto fail");;
		}
		puts("sendto complete");
	}
}
```
<br><br>

2. 클라이언트: UDP 소켓 생성(socket()) $\rightarrow$ 서버의 IP와 포트 번호를 지정해 데이터를 바로 날림 (sendto()) $\rightarrow$ 서버가 보낸 응답을 받음 (recvfrom())
```C
#include "netprog.h"
#define MAXLINE 511

// udp_echocli.c
int main(int argc, char* argv[]) {
    // 서버의 주소를 저장할 공간
    struct sockaddr_in servaddr; 
    int s, nbyte, addrlen = sizeof(servaddr);
    char buf[MAXLINE + 1];

    if (argc != 3) { // 실행 시 IP와 포트 번호가 필요함
        printf("usage: %s, ip_addr port\n", argv[0]); 
        exit(0);
    }

    // 소켓 생성 
    if((s = socket(PF_INET, SOCK_DGRAM, 0)) < 0)
        errquit("socket fail");

    // 서버 주소 설정 (어디로 보낼지 적기)
    bzero((char*)&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    // inet_pton: 글자(예: "127.0.0.1")로 된 IP를 컴퓨터가 이해하는 숫자 형태로 변환
    inet_pton(AF_INET, argv[1], &servaddr.sin_addr);
    servaddr.sin_port = htons(atoi(argv[2]));
    
    printf("입력: ");
    // 키보드로부터 메시지 입력받기
    if (fgets(buf, sizeof(buf), stdin) == NULL)
        errquit("fgets 실패");

    // sendto: 서버 주소(servaddr)로 메시지 전송
    if (sendto(s, buf, strlen(buf), 0, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0)
        errquit("sendto fail");

    // recvfrom: 서버가 다시 보내줄 답장을 대기
    // 보낼 때 사용했던 servaddr을 그대로 써서 답장을 받음
    if ((nbyte = recvfrom(s, buf, MAXLINE, 0, (struct sockaddr*)&servaddr, &addrlen)) < 0)
        errquit("recvfrom fail");

    buf[nbyte] = 0;
    printf("수신: %s", buf);
    
    // 소켓 닫기
    close(s);
}
```
<br><br><br>


### TCP 소켓 프로그래밍
상세 특징:
- 연결성: 데이터를 주고받기 전, 반드시 3-Way Handshake라는 과정을 통해 서버와 클라이언트가 연결을 확인.
- 신뢰성 보장: 데이터가 중간에 유실되면 다시 보내달라고 요청하며(재전송), 도착한 데이터의 순서가 뒤바뀌면 원래 순서대로 재조합함
- 흐름 및 혼잡 제어: 받는 쪽의 처리 속도나 네트워크 상황에 맞춰 데이터 전송량을 조절
- 스트림 방식: 데이터의 경계가 없음. 보낸 쪽에서 100바이트 한 번에 보내도 받는 쪽에서 50바이트씩 두 번에 나누어 받을 수 있음.
<br><br>

통신흐름:
1. 서버: TCP 소켓 생성(socket()) $\rightarrow$ 소켓에 주소(IP, Port)를 할당 $\rightarrow$ 클라이언트의 연결 요청을 기다리는 상태로 전환(listen()) $\rightarrow$ 클라이언트의 요청이 오면 수락하여 실제 통신용 소켓을 따로 생성(accept()) $\rightarrow$ 데이터를 주고 받음(recv(), send())
```C
#include "netprog.h"
#define MAXLINE 511

int main(int argc, char *argv[]){
    // 서버, 클라이언트 주소
    struct sockaddr_in servaddr, cliaddr;

    // listen_sock: 손님 전화를 기다리는 소켓 
    // accp_sock: 실제 연결되어 대화를 나눌 소켓 
    int listen_sock, accp_sock, addrlen = sizeof(cliaddr), nbyte;

    // 데이터 담을 버퍼(바구니)
    char buf[MAXLINE+1];

    if (argc != 2) {
        printf("usage: %s port\n", argv[0]);
        exit(0);
    }

    // 소켓 생성 (SOCK_STREAM: TCP 방식을 사용하겠다는 뜻)
    if ((listen_sock = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        errquit("socket fail");
    }

    // 주소 초기화 및 설정
    bzero((char*)&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY); // 어떤 IP로 들어오든 받겠다
    servaddr.sin_port = htons(atoi(argv[1]));     // 입력받은 포트 번호 설정

    // bind: 소켓에 번호표(주소)를 붙임
    if (bind(listen_sock, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0) {
        errquit("bind fail");
    }

    // listen: 문지기 우체통 역할 (손님 전화가 올 때까지 벨소리를 켜두는 작업)
    // 5는 백로그 큐 크기로, 연결 대기자 명단의 최대 길이를 의미함
    listen(listen_sock, 5);

    // 서버 루프 (무한 대기)
    while(1) {
        puts("서버가 연결요청 기다림...");

        // accept: 벨이 울리면 전화를 받아 연결함 
        // listen_sock은 계속 대기해야 하므로, 손님과 대화할 '새로운 소켓(accp_sock)'을 반환함
        accp_sock = accept(listen_sock, (struct sockaddr*)&cliaddr, &addrlen);
        if (accp_sock < 0) {
            errquit("accept fail");
        }

        puts("클라이언트가 연결됨...");

        // 통신: TCP는 스트림 방식이라 read/write 함수를 사용함
        // 클라이언트가 보낸 데이터를 읽음(read) 
        nbyte = read(accp_sock, buf, MAXLINE);

        // TCP는 1대1 전용 통로(파이프)가 연결된 상태라서 sendto에서 처럼 주소를 따로 적을 필요가 없음. write로 바로 보내버림.
        write(accp_sock, buf, nbyte);

        // 통화 종료: 이번 손님과의 대화를 마침
        close(accp_sock);
    }
    
    close(listen_sock);
    return 0;
}
```
<br><br>

2. 클라이언트: TCP 소켓 생성(socket()) $\rightarrow$ 서버의 주소로 연결을 요청. 이때 3-Way Handshake 발생(connect()) $\rightarrow$ 데이터를 주고 받음(recv(), send())
```C
#include "netprog.h"
#define MAXLINE 511

int main(int argc, char *argv[]) {
    // 서버의 주소를 저장할 공간
    struct sockaddr_in servaddr;
    int s, nbyte;
    char buf[MAXLINE+1];
    
    // 클라이언트 자신의 정보를 확인하기 위한 변수
    struct sockaddr_in cliaddr;
    int addrlen = sizeof(cliaddr);

    if (argc != 3) {
        printf("usage: %s ip_address port_number\n", argv[0]);
        exit(0);
    }

    // 소켓 생성 (TCP 방식)
    if ((s = socket(PF_INET, SOCK_STREAM, 0)) < 0)
        errquit("socket fail");

    // 서버 주소 준비 (어디로 전화를 걸지)
    bzero((char*)&servaddr, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    inet_aton(argv[1], &servaddr.sin_addr); // 문자열 IP를 이진 주소로 변환
    servaddr.sin_port = htons(atoi(argv[2]));

    // connect: 서버에 전화 걸기 (연결 요청), 서버가 accept()를 호출할 때까지 기다렸다가 연결이 성공하면 통로가 생김
    if (connect(s, (struct sockaddr *)&servaddr, sizeof(servaddr)) < 0)
        errquit("connect fail");

    // getsockname: 운영체제가 클라이언트에게 부여한 주소를 확인해봄
    // 클라이언트는 보통 포트를 자동 할당받으므로 어떤 번호를 썼는지 확인용으로 사용
    getsockname(s, (struct sockaddr*)&cliaddr, &addrlen);
    char IPaddr[20];
    inet_ntop(AF_INET, &cliaddr.sin_addr, IPaddr, sizeof(IPaddr)); // 이진 주소를 다시 문자로
    printf("client %s:%u\n", IPaddr, ntohs(cliaddr.sin_port));

    printf("입력: ");
    if (fgets(buf, sizeof(buf), stdin) == NULL)
        errquit("fgets 실패\n");
    
    nbyte = strlen(buf);

    //  write: 연결된 선을 통해 서버로 데이터 전송
    if (write(s, buf, nbyte) < 0)
        errquit("write fail");

    printf("수신: ");
    // read: 서버가 돌려준 답장을 기다려서 읽음
    if ((nbyte = read(s, buf, MAXLINE)) < 0)
        errquit("read fail");

    buf[nbyte] = 0; // 문자열 끝 표시
    printf("%s", buf);

    // 종료
    close(s);
    return 0;
}
```
**참고**: getsockname() 의 역할: <br>
connect 전에는 클라이언트 소켓은 IP, Port가 없음. connect를 호출하면 운영체제는 비어있는 포트 중 하나를 골라서 소켓에 자동으로 할당함. 
connect가 성공하면 클라이언트 소켓에도 IP랑 포트번호가 생기지만, 몇 번인지 알 수가 없음. <br>
그래서 getsockname()으로 운영체제가 준 IP랑 포트번호가 몇 번인지 확인하는 것. 정확히는 cliaddr 구조체 변수에 IP(바이너리 형태)와 포트번호를 적어줌.


<br><br><br>

### TCP vs UDP
|구분|TCP(연결형)|UDP(비연결형)|
|------|---|---|
|연결설정|3-way 연결 설정, 4-way 연결종료|없음(바로 던짐)|
|데이터 특징|종점간 바이트 스트림 제공 (순서 보장)|데이터 그램 단위로 송수신 (순서 보장x)|
|신뢰성|높음(확인응답, 체크섬, 재전송)|낮음(데이터 분실 확인 안함)|
|제어 기능|흐름(빨리 말하는데 못 알아들음)/오류/혼잡제어|제어 없음(오버헤드 작고 빠름)|
|주요 사례|HTTP, E-mail, FTP 등|실시간 스트리밍|