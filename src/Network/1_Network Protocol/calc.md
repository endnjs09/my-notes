# 계산기 문제 
클라이언트가 예를 들어 1 + 2 라고 서버에 보내면 서버에서는 정답인 3을 내뱉어야 하는 코드를 짜보자. (과제로 나옴..)<br>
<br>

### 1. 서버
```C
// calcserv.c
#include "netprog2.h"
#define MAXLINE 511

struct calc_req {
    long op1;       // 피연산자1
    long op2;       // 피연산자2
    char operator;  // 연산자
};


struct calc_resp {
    long result;    // 계산 결과
    char status;    // 상태
};


int main(int argc, char *argv[]) {
    struct sockaddr_in servaddr, cliaddr;
    // 서버, 클라이언트 주소
   
    struct calc_resp res;   
    struct calc_req req;
   
    int s, nbyte, addrlen = sizeof(struct sockaddr);
    // 소켓 번호, 받은 바이트 수, 주소 길이를 저장할 변수
    char buf[MAXLINE + 1];
    // 데이터 담을 버퍼(바구니)
   
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
    servaddr.sin_port = htons(atoi(argv[1]));   // 실행 시 입력한 숫자를 포트 번호로 설정
   
    // bind: 소켓에 주소를 입힘 (Port번호로 오는 데이터를 소켓(s)로 넣기)
    if (bind(s, (struct sockaddr*)&servaddr, addrlen) < 0) {
        errquit("bind fail");
    }
    // ----------------여기까지는 한 세트라고 생각하면 됨 ------------------

   
    // 서버 열기 (상시)
    while (1) {
        puts("Server: waiting request.");
        // recvfrom: 요청이 올때까지 기다림
        // cliaddr: 요청이 오면 보낸 사람의 주소를 여기에 적음
        nbyte = recvfrom(s, &req, sizeof(req), 0, (struct sockaddr*)&cliaddr, &addrlen);
        if (nbyte < 0) {
            errquit("recvfrom fail");
        }
       
        // 요청 받은 피연산자, 연산자
        long op1 = ntohl(req.op1);
        long op2 = ntohl(req.op2);
        char op = req.operator;
        // 상태, 결과 초기화
        res.status = 0; 
        res.result = 0;
       
        if (op == '+') {
            res.result = op1 + op2;
        }
        else if (op == '-') {
            res.result = op1 - op2;
        }
        else if (op == '*') {
            res.result = op1 * op2;
        }
        else if (op == '/') {
            if (op2 == 0) res.status = 1;   // 0으로 나눔
            else res.result = op1 / op2;
        }
        else {
            res.status = 2; // 잘못된 연산자    
        }
       
        // 계산 성공시 네트워크 바이트 순서로 변환함
        if (res.status == 0) res.result = htonl(res.result);
       
        sendto(s, &res, sizeof(res), 0, (struct sockaddr*)&cliaddr, addrlen);

        puts("sendto complete");
    }
   
}

```
<br><br>

### 2. 클라이언트
```C
// calccli.c
#include "netprog2.h"
#define MAXLINE 511


struct calc_req {
    long op1;
    long op2;
    char operator;  // 연산자
};


struct calc_resp {
    long result;    // 계산 결과
    char status;    // 상태
};


int main(int argc, char* argv[]) {
    struct sockaddr_in servaddr; // 서버의 주소를 저장할 공간
    struct calc_resp res;
    struct calc_req req;
    int s, nbyte, addrlen = sizeof(servaddr);
    // 소켓 번호, 받은 바이트 수, 주소 길이를 저장할 변수
    char buf[MAXLINE + 1];
    // 데이터 담을 버퍼(바구니)

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
    // ----------------여기까지는 한 세트라고 생각하면 됨 ------------------
   

    while(1) {
        printf("계산식 입력(지원되는 연산 + - * /, 끝내려면 exit) : ");
        // 키보드로부터 메시지 입력받기
        if (fgets(buf, sizeof(buf), stdin) == NULL)
            errquit("fgets 실패");
       
        if (strncmp(buf, "exit", 4) == 0) break;    // exit 입력시 종료
       
        if (sscanf(buf, "%ld %c %ld", &req.op1, &req.operator, &req.op2) < 3) {
            printf("입력 형식이 잘못되었습니다.\n");
            continue;
        }
        
        long hop1 = req.op1;
        long hop2 = req.op2;
        req.op1 = htonl(hop1);
        req.op2 = htonl(hop2);
        char op = req.operator;

        // sendto: 서버 주소(servaddr)로 메시지 전송
        if (sendto(s, &req, sizeof(req), 0, (struct sockaddr*)&servaddr, sizeof(servaddr)) < 0)
            errquit("sendto fail");

        // recvfrom: 서버가 다시 보내줄 답장을 대기
        // 보낼 때 사용했던 servaddr을 그대로 써서 답장을 받음
        if ((nbyte = recvfrom(s, &res, sizeof(res), 0, (struct sockaddr*)&servaddr, &addrlen)) < 0)
            errquit("recvfrom fail");
       
        // 결과 
        long hres = ntohl(res.result);

        if (res.status == 0) {
            printf("%ld %c %ld = %ld\n", hop1, op, hop2, hres);
        }
        else if (res.status == 1) {
            printf("0으로 나눔\n");
        }
        else if (res.status == 2) {
            printf("지원되지 않는 연산자 %c\n", op);
        }
    }
   
    // 소켓 닫기
    close(s);
    return 0;
}


```