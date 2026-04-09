# 1대1 통신 프로그램
사용자가 키보드에서 입력한 메시지는 상대방에게 전송하고, 상대방이 전송한 메시지는 화면에 출력. 즉, 클라이언트와 1대1 통신을 하는 프로그램을 만들어보자.
<br>

|서버|클라이언트|
|---|--------|
|listen(), accept(), fork(), <br>send() → 부모 / recv() → 자식|connect(), fork(), send(), <br>send() → 부모 / recv() → 자식
<br>

### 1. 서버
```C
#include "netprog.h"
#define MAXLINE 511

char *EXIT_STRING = "exit";
int recv_and_print(int sd);
int input_and_send(int sd);

int main(int argc, char *argv[]) {
    struct sockaddr_in cliaddr, servaddr;
    int listen_sock, accp_sock, addrlen = sizeof(cliaddr);
    pid_t pid;

    if (argc != 2) {
        printf("사용법: %s port\n", argv[0]);
        exit(0);
    }

    // 소켓 생성
    if ((listen_sock = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        errquit("socket fail");
    }

    // 서버의 소켓주소 구조체 servaddr을 '0'으로 초기화
    bzero((char*)&servaddr, sizeof(servaddr));

    // servaddr 세팅
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(atoi(argv[1]));

    // bind() 호출
    if (bind(listen_sock, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0) {
        errquit("bind fail");
    }

    puts("서버가 클라이언트를 기다림...");
    listen(listen_sock, 1);

    if ((accp_sock = accept(listen_sock, (struct sockaddr*)&cliaddr, &addrlen)) < 0) {
        errquit("accept fail");
    }
    puts("클라이언트가 연결되었습니다.");
	
    if ((pid = fork()) > 0) 
        input_and_send(accp_sock);  // 키보드 입력받고 상대에게 메세지 전달
    else if (pid == 0) {
		recv_and_print(accp_sock);  // 상대로부터 메시지 수신후 화면에 출력
		char line[80];
		sprintf(line, "%d", accp_sock);
		// execl("./tcp_talkexec", "tcp_talkexec", line, NULL); 
        // tcp_talkexec 에는 recv_and_print와 같은 내용이 들어있음
	}
    close(listen_sock);
    close(accp_sock);

    return 0;
}

int input_and_send(int sd) {
    char buf[MAXLINE + 1];
    int nbyte;
    while(fgets(buf, sizeof(buf), stdin) != NULL) {
        nbyte = strlen(buf);
        write(sd, buf, strlen(buf));
        // 종료 문자열 입력 처리
        if (strstr(buf, EXIT_STRING) != NULL) {
            puts("GOOD BYE.");
            close(sd);
            exit(0);
        }
    }
	
	return 0;
}

int recv_and_print(int sd) {
    char buf[MAXLINE + 1];
    int nbyte;
    while(1) {
        if ((nbyte = read(sd, buf, MAXLINE)) < 0) {
            perror("read fail");
            close(sd);
            exit(0);
        }
        buf[nbyte] = 0;
        // 종료 문자열 입력 처리
        if (strstr(buf, EXIT_STRING) != NULL) 
            break;

        printf("%s", buf);
    }
    return 0;
}
```
<br><br>


### 2. 클라이언트
```C
#include "netprog.h"
#define MAXLINE 511

char *EXIT_STRING = "exit";
int recv_and_print(int sd);
int input_and_send(int sd);

int main(int argc, char *argv[]) {
    pid_t pid;
    static int s;
    static struct sockaddr_in servaddr;
	
    // 명령문 입력 인자 처리
    if (argc != 3) {
        printf("사용법: %s server_ip port\n", argv[0]);
        exit(0);
    }
    // 소켓 생성
    if ((s = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        errquit("Client: Can't open stream socket.");
    }

    // 서버의 소켓주소 구조체 servaddr을 '0'으로 초기화
    bzero((char*)&servaddr, sizeof(servaddr));

    // servaddr 세팅
    servaddr.sin_family = AF_INET;
    inet_pton(AF_INET, argv[1], &servaddr.sin_addr);
    servaddr.sin_port = htons(atoi(argv[2]));

    // 서버에 연결요청
    if (connect(s, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0) {
        printf("Client: Can't open stream socket.\n");
        exit(0);
    }

    if ((pid = fork()) > 0) 
        input_and_send(s);  // 부모 프로세스
    else if (pid == 0) {
		recv_and_print(s);  // 자식 프로세스
		char line[80];
		sprintf(line, "%d", s);
		// execl("tcp_talkexec", "tcp_talkexec", line, NULL);
	}

    close(s);
    return 0;
}

int input_and_send(int sd) {
    char buf[MAXLINE + 1];
    int nbyte;
    while(fgets(buf, sizeof(buf), stdin) != NULL) {
        nbyte = strlen(buf);
        write(sd, buf, strlen(buf));
        // 종료 문자열 입력 처리
        if (strstr(buf, EXIT_STRING) != NULL) {
            puts("GOOD BYE.");
            close(sd);
            exit(0);
        }
    }
	return 0;
}

int recv_and_print(int sd) {
    char buf[MAXLINE + 1];
    int nbyte;
    while(1) {
        if ((nbyte = read(sd, buf, MAXLINE)) < 0) {
            perror("read fail");
            close(sd);
            exit(0);
        }
        buf[nbyte] = 0;
        // 종료 문자열 입력 처리
        if (strstr(buf, EXIT_STRING) != NULL) 
            break;

        printf("%s", buf);
    }
    return 0;
}
```




